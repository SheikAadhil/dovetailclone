import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  // First get the theme to check ownership
  const { data: theme, error: fetchError } = await supabase
    .from("themes")
    .select("*, channels!inner(workspace_id, workspaces!inner(owner_id))")
    .eq("id", params.themeId)
    .eq("channels.workspaces.owner_id", userId)
    .single();

  if (fetchError || !theme) {
    console.error("Theme fetch error:", fetchError);
    return new NextResponse("Theme not found or unauthorized", { status: 404 });
  }

  // Create a new theme as a copy
  const { data: newTheme, error: createError } = await supabase
    .from("themes")
    .insert({
      channel_id: params.id,
      workspace_id: theme.workspace_id,
      name: `${theme.name} (Copy)`,
      summary: theme.summary,
      description: theme.description,
      is_manual: true,
      is_pinned: false,
      sentiment_breakdown: theme.sentiment_breakdown,
    })
    .select()
    .single();

  if (createError) {
    console.error("Error copying theme:", createError);
    return new NextResponse("Error copying theme: " + createError.message, { status: 500 });
  }

  // Copy all data point associations
  const { data: associations, error: assocError } = await supabase
    .from("data_point_themes")
    .select("*")
    .eq("theme_id", params.themeId);

  if (associations && associations.length > 0) {
    const newAssociations = associations.map((assoc) => ({
      data_point_id: assoc.data_point_id,
      theme_id: newTheme.id,
      relevance_score: assoc.relevance_score,
    }));

    const { error: insertAssocError } = await supabase
      .from("data_point_themes")
      .insert(newAssociations);

    if (insertAssocError) {
      console.error("Error copying associations:", insertAssocError);
    }

    // Update the new theme's data_point_count
    await supabase
      .from("themes")
      .update({ data_point_count: associations.length })
      .eq("id", newTheme.id);
  }

  return NextResponse.json(newTheme);
}
