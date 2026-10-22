import { Heading, PhoneFrame, TabBar } from "@/components/ui";

/** Messages: empty in this build. Introductions open a conversation. */
export function Messages() {
  return (
    <PhoneFrame footer={<TabBar />}>
      <Heading>Messages</Heading>
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-[17px] font-extrabold tracking-[-0.02em]">No conversations yet.</p>
        <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-ink3">
          Introductions open a conversation — there&rsquo;s no cold messaging here.
        </p>
      </div>
    </PhoneFrame>
  );
}
