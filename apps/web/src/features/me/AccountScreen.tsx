"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { AppShell, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { session } from "@/lib/session";
import { BackLink, Eyebrow, focus } from "@/features/cafe/shared";

const card = "rounded-[16px] border border-rule bg-card p-4";

/** G3 · Account: sign-in note, download my data, delete my account, sign out. */
export function AccountScreen({ founderId }: { founderId: string }) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  async function download() {
    setExporting(true);
    setExportStatus(null);
    try {
      const data = await api.exportMyData(founderId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "idea-district-my-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportStatus({ ok: true, text: "Done. Downloaded as idea-district-my-data.json." });
    } catch (e) {
      setExportStatus({ ok: false, text: `Couldn't get your data. ${errorMessage(e)}` });
    } finally {
      setExporting(false);
    }
  }

  async function remove() {
    if (typed !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(founderId);
      session.signOut();
      router.replace("/");
    } catch (e) {
      setDeleteError(`Couldn't delete your account. ${errorMessage(e)}`);
      setDeleting(false);
    }
  }

  function signOut() {
    session.signOut();
    router.replace("/");
  }

  return (
    <AppShell>
      <BackLink href="/you" label="You" />
      <Eyebrow>Me</Eyebrow>
      <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">Account</h1>

      <section className={`mt-6 ${card}`} aria-labelledby="acc-signin">
        <h2 id="acc-signin" className="text-[15px] font-bold">
          Sign-in
        </h2>
        <p className="mt-1 text-[14px] leading-relaxed text-ink2">
          Sign-in: no login in this demo; the live app uses a phone or email code.
        </p>
      </section>

      <section className={`mt-4 ${card}`} aria-labelledby="acc-data">
        <h2 id="acc-data" className="text-[15px] font-bold">
          Your data
        </h2>
        <p className="mt-1 text-[14px] leading-relaxed text-ink2">
          Everything you gave us and everything we worked out about you, in one file.
        </p>
        <Button variant="secondary" className="mt-3 w-auto" onClick={() => void download()} disabled={exporting}>
          {exporting ? "Preparing…" : "Download my data"}
        </Button>
        <p aria-live="polite" className={`mt-2 text-[13px] ${exportStatus?.ok ? "text-ink2" : "text-ember-deep"}`}>
          {exportStatus?.text ?? ""}
        </p>
      </section>

      <section className={`mt-4 ${card}`} aria-labelledby="acc-delete">
        <h2 id="acc-delete" className="text-[15px] font-bold">
          Delete my account
        </h2>
        <p className="mt-1 text-[14px] leading-relaxed text-ink2">
          This is permanent. It removes your District, your answers, your posts and your messages, and it can&rsquo;t be undone.
        </p>
        {!confirming ? (
          <Button
            variant="secondary"
            className="mt-3 w-auto text-ember-deep"
            onClick={() => {
              setConfirming(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            Delete my account
          </Button>
        ) : (
          <form
            className="mt-3 rounded-[12px] border border-ember bg-ember-tint p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void remove();
            }}
          >
            <label htmlFor={inputId} className="block text-[14px] font-bold">
              Type DELETE to confirm
            </label>
            <p id={hintId} className="mt-0.5 text-[13px] text-ink2">
              Capital letters, exactly as shown.
            </p>
            <input
              ref={inputRef}
              id={inputId}
              aria-describedby={hintId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={`mt-2 min-h-[44px] w-full rounded-[10px] border border-rule bg-card px-3 text-[15px] ${focus}`}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="submit" variant="dark" className="w-auto" disabled={typed !== "DELETE" || deleting}>
                {deleting ? "Deleting…" : "Delete permanently"}
              </Button>
              <Button
                variant="secondary"
                className="w-auto"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                  setDeleteError(null);
                }}
              >
                Keep my account
              </Button>
            </div>
            {deleteError ? (
              <p role="alert" className="mt-2 text-[13px] text-ember-deep">
                {deleteError}
              </p>
            ) : null}
          </form>
        )}
      </section>

      <section className={`mt-4 ${card}`} aria-labelledby="acc-out">
        <h2 id="acc-out" className="text-[15px] font-bold">
          Sign out
        </h2>
        <p className="mt-1 text-[14px] leading-relaxed text-ink2">This forgets you on this device. Your District stays as it is, but with no login in this demo there&rsquo;s no way back in afterwards.</p>
        <Button variant="secondary" className="mt-3 w-auto" onClick={signOut}>
          Sign out
        </Button>
      </section>
    </AppShell>
  );
}
