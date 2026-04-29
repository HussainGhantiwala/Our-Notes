import { useEffect, useState } from "react";
import { StickyNote } from "@/components/StickyNote";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NoteColor, NoteInput, NotePinStyle, NoteRow, NoteSticker } from "@/lib/notes";

const COLORS: { value: NoteColor; label: string }[] = [
  { value: "yellow", label: "butter" },
  { value: "pink", label: "blush" },
  { value: "mint", label: "mint" },
  { value: "blue", label: "bluebell" },
  { value: "lavender", label: "lavender" },
  { value: "peach", label: "peach" },
];

const PINS: { value: NotePinStyle; label: string }[] = [
  { value: "tape", label: "tape" },
  { value: "pin", label: "pin" },
  { value: "none", label: "none" },
];

const STICKERS: { value: NoteSticker; label: string }[] = [
  { value: "none", label: "none" },
  { value: "❤️", label: "heart" },
  { value: "🌷", label: "tulip" },
  { value: "✨", label: "sparkle" },
  { value: "🍃", label: "leaf" },
  { value: "📮", label: "mailbox" },
  { value: "💌", label: "love note" },
  { value: "📍", label: "pin" },
];

interface Props {
  open: boolean;
  note: NoteRow | null;
  defaultValue: NoteInput;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: NoteInput) => Promise<void> | void;
}

export const NoteEditorModal = ({
  open,
  note,
  defaultValue,
  saving = false,
  onOpenChange,
  onSave,
}: Props) => {
  const [form, setForm] = useState<NoteInput>(defaultValue);

  useEffect(() => {
    if (!open) return;
    if (note) {
      setForm({
        front_text: note.front_text,
        back_text: note.back_text,
        color: note.color,
        rotation: note.rotation,
        pin_style: note.pin_style,
        sticker: note.sticker,
      });
      return;
    }
    setForm(defaultValue);
  }, [defaultValue, note, open]);

  const submit = async () => {
    await onSave({
      ...form,
      front_text: form.front_text.trim(),
      back_text: form.back_text.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1.5rem)] max-h-[90vh] paper border-none p-0 overflow-hidden flex flex-col">
        <div className="grid flex-1 min-h-0 gap-0 md:grid-cols-[1.08fr_0.92fr]">
          <div className="min-h-0 overflow-y-auto p-5 md:p-6 border-b md:border-b-0 md:border-r border-ink/10 bg-cream/60">
            <DialogHeader className="text-left">
              <p className="font-print text-xs tracking-[0.35em] uppercase text-ink-soft">journal lite mode</p>
              <DialogTitle className="font-script text-4xl text-ink">
                {note ? "Edit note" : "Add note"}
              </DialogTitle>
              <DialogDescription className="font-hand text-lg text-ink-soft">
                Short on the front, deeper on the back.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-5 pb-1">
              <label className="block">
                <span className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft">Front text</span>
                <textarea
                  value={form.front_text}
                  onChange={(event) => setForm((current) => ({ ...current, front_text: event.target.value }))}
                  rows={3}
                  placeholder="The quick little thought on the sticky note..."
                  className="mt-2 w-full rounded-sm border border-ink/10 bg-white/70 px-4 py-3 font-hand text-xl text-ink outline-none focus:border-rose/40 resize-none"
                />
              </label>

              <label className="block">
                <span className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft">Back text</span>
                <textarea
                  value={form.back_text}
                  onChange={(event) => setForm((current) => ({ ...current, back_text: event.target.value }))}
                  rows={7}
                  placeholder="The full note that opens in the modal..."
                  className="mt-2 w-full rounded-sm border border-ink/10 bg-white/70 px-4 py-3 font-hand text-xl text-ink outline-none focus:border-rose/40 resize-none"
                />
              </label>

              <div>
                <span className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft">Color</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, color: color.value }))}
                      className={`rounded-full px-3 py-1.5 font-hand text-base transition-all border ${
                        form.color === color.value
                          ? "border-rose bg-blush/50 text-ink"
                          : "border-ink/10 bg-white/70 text-ink-soft hover:text-ink"
                      }`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft">Rotation</span>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={-8}
                      max={8}
                      step={0.5}
                      value={form.rotation}
                      onChange={(event) => setForm((current) => ({ ...current, rotation: Number(event.target.value) }))}
                      className="w-full accent-rose"
                    />
                    <span className="w-12 text-right font-hand text-lg text-ink">{form.rotation}°</span>
                  </div>
                </label>

                <div>
                  <span className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft">Pin or tape</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PINS.map((pin) => (
                      <button
                        key={pin.value}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, pin_style: pin.value }))}
                        className={`rounded-full px-3 py-1.5 font-hand text-base transition-all border ${
                          form.pin_style === pin.value
                            ? "border-rose bg-blush/50 text-ink"
                            : "border-ink/10 bg-white/70 text-ink-soft hover:text-ink"
                        }`}
                      >
                        {pin.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft">Sticker</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {STICKERS.map((sticker) => (
                    <button
                      key={sticker.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, sticker: sticker.value === "none" ? null : sticker.value }))}
                      className={`rounded-full px-3 py-1.5 font-hand text-base transition-all border ${
                        (form.sticker ?? "none") === sticker.value
                          ? "border-rose bg-blush/50 text-ink"
                          : "border-ink/10 bg-white/70 text-ink-soft hover:text-ink"
                      }`}
                    >
                      {sticker.value === "none" ? "none" : sticker.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-5 md:p-6 bg-background/60">
            <p className="font-print text-xs tracking-[0.35em] uppercase text-ink-soft">Preview</p>
            <div className="mt-4 space-y-4">
              <StickyNote
                color={form.color}
                rotate={form.rotation}
                accessory={form.pin_style}
                sticker={form.sticker}
                className="min-h-[210px]"
              >
                <p className="whitespace-pre-wrap break-words">
                  {form.front_text || "Your note front preview appears here."}
                </p>
              </StickyNote>

              <div className="paper-lined rounded-sm p-5 min-h-[210px] relative">
                {form.sticker && (
                  <span className="absolute top-4 right-4 text-2xl leading-none" aria-hidden>
                    {form.sticker}
                  </span>
                )}
                <p className="font-script text-3xl text-rose mb-4">a little note</p>
                <p className="font-hand text-xl text-ink leading-relaxed whitespace-pre-wrap">
                  {form.back_text || "The full note preview appears here once the sticky note is opened."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-ink/10 px-5 md:px-6 py-3 bg-cream/70 shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="font-hand text-lg text-ink-soft hover:text-rose px-2 py-1"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !form.front_text.trim() || !form.back_text.trim()}
            className="bg-rose/90 hover:bg-rose disabled:opacity-60 disabled:cursor-not-allowed text-cream font-hand text-lg px-5 py-2 rounded-sm shadow-paper"
          >
            {saving ? "saving..." : note ? "save note" : "create note"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
