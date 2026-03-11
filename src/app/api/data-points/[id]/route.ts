import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  // First get the data point to check ownership
  const { data: dataPoint, error: fetchError } = await supabase
    .from("data_points")
    .select("channel_id, channels(workspace_id, workspaces(owner_id))")
    .eq("id", params.id)
    .single();

  if (fetchError || !dataPoint) {
    return new NextResponse("Data point not found", { status: 404 });
  }

  // Check workspace ownership
  const workspaceId = dataPoint.channels?.workspaces?.owner_id;
  if (workspaceId !== userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Delete the data point (this will cascade delete data_point_themes)
  const { error: deleteError } = await supabase
    .from("data_points")
    .delete()
    .eq("id", params.id);

  if (deleteError) {
    console.error("Error deleting data point:", deleteError);
    return new NextResponse("Error deleting data point", { status: 500 });
  }

  return new NextResponse("Deleted", { status: 200 });
}
