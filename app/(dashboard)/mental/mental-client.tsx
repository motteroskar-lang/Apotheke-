"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DomainHeader } from "@/components/layout/domain-header";
import { TrendChart } from "@/components/charts/trend-chart";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Brain, BookOpen, PenLine, Timer } from "lucide-react";
import { cn, isoDate, formatDurationMinutes } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { MORNING_PROMPTS, EVENING_PROMPTS } from "@/lib/constants/journal-prompts";

interface DeepWork { id: string; session_date: string; duration_minutes: number; project: string | null; focus_quality: number | null; }
interface Book { id: string; book_title: string; author: string | null; category: string; status: string; pages_total: number | null; pages_read: number; key_insight: string | null; rating: number | null; }
interface Journal { id: string; entry_date: string; entry_type: string; content: string | null; mood: number | null; energy_level: number | null; }

interface Props {
  deepWork: DeepWork[];
  reading: Book[];
  journal: Journal[];
}

type LogModal = "deepwork" | "book" | "journal" | null;

export function MentalClient({ deepWork: initDW, reading: initReading, journal: initJournal }: Props) {
  const [deepWork, setDeepWork] = useState<DeepWork[]>(initDW);
  const [reading, setReading] = useState<Book[]>(initReading);
  const [journal, setJournal] = useState<Journal[]>(initJournal);
  const [modal, setModal] = useState<LogModal>(null);

  const [dwForm, setDwForm] = useState({
    session_date: isoDate(), duration_minutes: "", project: "", focus_quality: "7", distractions: "0",
  });

  const [bookForm, setBookForm] = useState({
    book_title: "", author: "", category: "other", status: "reading", pages_total: "", key_insight: "",
  });

  const [journalForm, setJournalForm] = useState({
    entry_date: isoDate(), entry_type: "daily", content: "", mood: "7", energy_level: "7",
  });

  const today = isoDate();
  const prompt = MORNING_PROMPTS[new Date().getDay() % MORNING_PROMPTS.length];

  const totalDeepWorkHours = deepWork.reduce((a, d) => a + d.duration_minutes, 0) / 60;
  const avgFocusQuality = deepWork.length > 0
    ? (deepWork.reduce((a, d) => a + (d.focus_quality ?? 0), 0) / deepWork.length).toFixed(1)
    : null;

  const currentlyReading = reading.filter((b) => b.status === "reading");
  const completedBooks = reading.filter((b) => b.status === "completed").length;

  const deepWorkChartData = deepWork
    .slice()
    .reverse()
    .map((d) => ({ date: d.session_date, value: d.duration_minutes }));

  const handleLogDeepWork = async () => {
    if (!dwForm.duration_minutes) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("deep_work_sessions").insert({
      user_id: user.id,
      session_date: dwForm.session_date,
      duration_minutes: parseInt(dwForm.duration_minutes),
      project: dwForm.project || null,
      focus_quality: dwForm.focus_quality ? parseInt(dwForm.focus_quality) : null,
      distractions: parseInt(dwForm.distractions || "0"),
    }).select().single();
    if (data) setDeepWork((prev) => [data, ...prev]);
    setModal(null);
    setDwForm({ session_date: isoDate(), duration_minutes: "", project: "", focus_quality: "7", distractions: "0" });
  };

  const handleAddBook = async () => {
    if (!bookForm.book_title.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("reading_log").insert({
      user_id: user.id,
      book_title: bookForm.book_title,
      author: bookForm.author || null,
      category: bookForm.category,
      status: bookForm.status,
      pages_total: bookForm.pages_total ? parseInt(bookForm.pages_total) : null,
      key_insight: bookForm.key_insight || null,
      start_date: bookForm.status === "reading" ? isoDate() : null,
    }).select().single();
    if (data) setReading((prev) => [data, ...prev]);
    setModal(null);
    setBookForm({ book_title: "", author: "", category: "other", status: "reading", pages_total: "", key_insight: "" });
  };

  const handleJournal = async () => {
    if (!journalForm.content.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("journal_entries").insert({
      user_id: user.id,
      entry_date: journalForm.entry_date,
      entry_type: journalForm.entry_type,
      content: journalForm.content,
      mood: journalForm.mood ? parseInt(journalForm.mood) : null,
      energy_level: journalForm.energy_level ? parseInt(journalForm.energy_level) : null,
    }).select().single();
    if (data) setJournal((prev) => [data, ...prev]);
    setModal(null);
    setJournalForm({ entry_date: isoDate(), entry_type: "daily", content: "", mood: "7", energy_level: "7" });
  };

  const todayJournal = journal.find((j) => j.entry_date === today);

  return (
    <div className="animate-fade-in">
      <DomainHeader
        title="Mental"
        subtitle="Deep work · Reading · Journal · Learning"
        accentColor="#A855F7"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setModal("book")}>
              <BookOpen size={12} /> Book
            </Button>
            <Button size="sm" variant="outline" onClick={() => setModal("journal")}>
              <PenLine size={12} /> Journal
            </Button>
            <Button size="sm" onClick={() => setModal("deepwork")}>
              <Plus size={12} /> Deep work
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Deep work (30d)", value: `${totalDeepWorkHours.toFixed(1)}h`, sub: `${deepWork.length} sessions` },
          { label: "Avg focus quality", value: avgFocusQuality ? `${avgFocusQuality}/10` : "—" },
          { label: "Currently reading", value: `${currentlyReading.length}`, sub: "books" },
          { label: "Books completed", value: `${completedBooks}` },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <span className="data-label">{s.label}</span>
            <span className="data-value text-base">{s.value}</span>
            {s.sub && <span className="text-2xs text-apex-text-disabled">{s.sub}</span>}
          </div>
        ))}
      </div>

      {/* Deep work chart */}
      {deepWork.length > 0 && (
        <div className="bg-apex-surface border border-apex-border rounded-lg p-4 mb-6">
          <p className="section-header">Deep Work Sessions (30d)</p>
          <TrendChart data={deepWorkChartData} color="#A855F7" unit="min" height={160} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Reading list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-header mb-0">Reading</p>
            <button onClick={() => setModal("book")} className="text-xs text-apex-blue hover:underline">+ Add book</button>
          </div>
          {reading.length === 0 ? (
            <div className="border border-dashed border-apex-border rounded-lg p-4 text-center">
              <BookOpen size={16} className="text-apex-text-disabled mx-auto mb-2" />
              <p className="text-xs text-apex-text-muted">No books tracked</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {reading.slice(0, 6).map((book) => (
                <div key={book.id} className="bg-apex-surface border border-apex-border rounded-md px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-apex-text-primary truncate">{book.book_title}</p>
                      {book.author && <p className="text-2xs text-apex-text-muted">{book.author}</p>}
                    </div>
                    <Badge variant={
                      book.status === "completed" ? "green"
                      : book.status === "reading" ? "blue"
                      : book.status === "abandoned" ? "red"
                      : "default"
                    }>
                      {book.status}
                    </Badge>
                  </div>
                  {book.key_insight && (
                    <p className="text-2xs text-apex-text-muted mt-1 italic line-clamp-2">
                      "{book.key_insight}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Journal */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-header mb-0">Journal</p>
            <button onClick={() => setModal("journal")} className="text-xs text-apex-blue hover:underline">
              {todayJournal ? "View today" : "+ Write today"}
            </button>
          </div>

          {/* Daily prompt */}
          <div className="bg-apex-surface-2 border border-apex-border rounded-md px-4 py-3 mb-3">
            <p className="text-2xs text-apex-text-muted mb-1">TODAY'S PROMPT</p>
            <p className="text-xs text-apex-text-secondary italic">{prompt}</p>
          </div>

          {journal.length === 0 ? (
            <div className="border border-dashed border-apex-border rounded-lg p-4 text-center">
              <PenLine size={16} className="text-apex-text-disabled mx-auto mb-2" />
              <p className="text-xs text-apex-text-muted">No journal entries</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {journal.slice(0, 4).map((entry) => (
                <div key={entry.id} className="bg-apex-surface border border-apex-border rounded-md px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-apex-text-muted">{entry.entry_date}</span>
                    <div className="flex items-center gap-2">
                      {entry.mood && <span className="text-2xs text-apex-text-disabled">mood {entry.mood}/10</span>}
                      {entry.energy_level && <span className="text-2xs text-apex-text-disabled">energy {entry.energy_level}/10</span>}
                    </div>
                  </div>
                  {entry.content && (
                    <p className="text-xs text-apex-text-secondary line-clamp-2">{entry.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent deep work */}
      {deepWork.length > 0 && (
        <div className="mt-6">
          <p className="section-header">Recent Sessions</p>
          <div className="flex flex-col gap-1">
            {deepWork.slice(0, 6).map((d) => (
              <div key={d.id} className="flex items-center gap-4 py-1.5 px-3 bg-apex-surface border border-apex-border rounded-md">
                <span className="font-mono text-xs text-apex-text-muted w-24 flex-shrink-0">{d.session_date}</span>
                <span className="text-xs text-apex-text-secondary flex-1">{d.project || "—"}</span>
                <span className="font-mono text-xs text-apex-text-primary">{formatDurationMinutes(d.duration_minutes)}</span>
                {d.focus_quality && (
                  <span className={cn("font-mono text-xs", d.focus_quality >= 7 ? "text-apex-green" : d.focus_quality >= 5 ? "text-apex-amber" : "text-apex-red")}>
                    {d.focus_quality}/10
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deep work modal */}
      <Modal open={modal === "deepwork"} onOpenChange={(o) => !o && setModal(null)} title="Log Deep Work">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={dwForm.session_date}
              onChange={(e) => setDwForm({ ...dwForm, session_date: e.target.value })} />
            <Input label="Duration (min)" type="number" placeholder="90" value={dwForm.duration_minutes}
              onChange={(e) => setDwForm({ ...dwForm, duration_minutes: e.target.value })} autoFocus />
          </div>
          <Input label="Project / Topic" placeholder="What did you work on?" value={dwForm.project}
            onChange={(e) => setDwForm({ ...dwForm, project: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Focus quality (1-10)" type="number" min="1" max="10" value={dwForm.focus_quality}
              onChange={(e) => setDwForm({ ...dwForm, focus_quality: e.target.value })} />
            <Input label="Distractions (#)" type="number" min="0" value={dwForm.distractions}
              onChange={(e) => setDwForm({ ...dwForm, distractions: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleLogDeepWork} disabled={!dwForm.duration_minutes} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Book modal */}
      <Modal open={modal === "book"} onOpenChange={(o) => !o && setModal(null)} title="Add Book">
        <div className="flex flex-col gap-4">
          <Input label="Title" placeholder="Book title" value={bookForm.book_title}
            onChange={(e) => setBookForm({ ...bookForm, book_title: e.target.value })} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Author" placeholder="Author name" value={bookForm.author}
              onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} />
            <Select label="Status" value={bookForm.status} onValueChange={(v) => setBookForm({ ...bookForm, status: v })}>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="reading">Reading</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={bookForm.category} onValueChange={(v) => setBookForm({ ...bookForm, category: v })}>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="psychology">Psychology</SelectItem>
              <SelectItem value="philosophy">Philosophy</SelectItem>
              <SelectItem value="biography">Biography</SelectItem>
              <SelectItem value="science">Science</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </Select>
            <Input label="Pages total" type="number" placeholder="320" value={bookForm.pages_total}
              onChange={(e) => setBookForm({ ...bookForm, pages_total: e.target.value })} />
          </div>
          <Textarea label="Key insight" placeholder="The single most important takeaway..." value={bookForm.key_insight}
            onChange={(e) => setBookForm({ ...bookForm, key_insight: e.target.value })} rows={2} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddBook} disabled={!bookForm.book_title.trim()} className="flex-1">Add</Button>
          </div>
        </div>
      </Modal>

      {/* Journal modal */}
      <Modal open={modal === "journal"} onOpenChange={(o) => !o && setModal(null)} title="Journal Entry" size="lg">
        <div className="flex flex-col gap-4">
          <div className="bg-apex-surface-2 rounded-md px-3 py-2">
            <p className="text-2xs text-apex-text-muted mb-1">PROMPT</p>
            <p className="text-xs text-apex-text-secondary italic">{prompt}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={journalForm.entry_date}
              onChange={(e) => setJournalForm({ ...journalForm, entry_date: e.target.value })} />
            <Select label="Type" value={journalForm.entry_type} onValueChange={(v) => setJournalForm({ ...journalForm, entry_type: v })}>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
              <SelectItem value="reflection">Reflection</SelectItem>
            </Select>
          </div>
          <Textarea label="Entry" placeholder="Write here..." value={journalForm.content}
            onChange={(e) => setJournalForm({ ...journalForm, content: e.target.value })} rows={7} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mood (1-10)" type="number" min="1" max="10" value={journalForm.mood}
              onChange={(e) => setJournalForm({ ...journalForm, mood: e.target.value })} />
            <Input label="Energy (1-10)" type="number" min="1" max="10" value={journalForm.energy_level}
              onChange={(e) => setJournalForm({ ...journalForm, energy_level: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleJournal} disabled={!journalForm.content.trim()} className="flex-1">Save entry</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
