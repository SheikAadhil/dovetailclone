import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Pulse",
  description: "Customer intelligence tool",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();

  // Workspace auto-creation logic
  if (user) {
    const supabase = await createSupabaseServerClient();
    
    // Check if workspace exists
    const { count } = await supabase
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (count === 0) {
      const workspaceName = user.firstName 
        ? `${user.firstName}'s Workspace` 
        : 'My Workspace';
        
      await supabase.from('workspaces').insert({
        name: workspaceName,
        owner_id: user.id,
        plan: 'free'
      });
    }
  }

  return (
    <ClerkProvider>
      <html lang="en" className={cn("font-sans antialiased", inter.variable)}>
        <body>
          <header className="p-4 border-b flex justify-end gap-4 bg-white sticky top-0 z-50">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 border rounded-md hover:bg-gray-50">Sign Up</button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
