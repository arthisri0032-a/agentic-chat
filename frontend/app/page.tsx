import ChatWindow from "@/components/ChatWindow";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <main className="flex-1 h-full">
        <ChatWindow />
      </main>
    </div>
  );
}
