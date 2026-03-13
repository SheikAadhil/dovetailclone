import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/channels");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-8 md:px-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-indigo-600 mb-6">
          Pulse
        </h1>
        <p className="mt-3 text-xl sm:text-2xl text-gray-600 max-w-2xl">
          Customer intelligence for internal tools.
          Group feedback into AI-powered themes automatically.
        </p>
        <div className="mt-10">
          <a
            href="/channels"
            className="px-8 py-3 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </a>
        </div>
      </main>
    </div>
  );
}
