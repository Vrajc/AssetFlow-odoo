import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { addDays, startOfWeek, format, setHours, setMinutes, isSameDay } from 'date-fns';
import { AlertTriangle, CalendarPlus, X } from 'lucide-react';
import { useResources, useResourceBookings, useBookingMutations } from '../../api/hooks';
import { Card, Button, Select, Input, Textarea, Modal, Pill, PageHeader } from '../../components/ui';
import { BOOKING_STATUS } from '../../lib/status';
import { fmtTime } from '../../lib/format';
import { apiError } from '../../api/client';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00

export default function Bookings() {
  const { data: resources } = useResources();
  const [resourceId, setResourceId] = useState('');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();
  const { data: bookings } = useResourceBookings(resourceId || resources?.[0]?.id, from, to);
  const activeResource = resourceId || resources?.[0]?.id || '';
  const [slot, setSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [conflict, setConflict] = useState<any>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const bookingsAt = (day: Date, hour: number) =>
    bookings?.filter((b) => { const s = new Date(b.startTime); return isSameDay(s, day) && s.getHours() <= hour && new Date(b.endTime).getHours() > hour; }) ?? [];

  const openSlot = (day: Date, hour: number) => {
    setConflict(null);
    setSlot({ start: setMinutes(setHours(day, hour), 0), end: setMinutes(setHours(day, hour + 1), 0) });
  };

  return (
    <div>
      <PageHeader title="Resource Booking" subtitle="Time-slot booking of shared resources — with overlap validation."
        actions={
          <Select value={activeResource} onChange={(e) => setResourceId(e.target.value)} className="w-56">
            {resources?.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.location}</option>)}
          </Select>
        } />

      <Card className="mb-4 flex items-center justify-between p-3">
        <Button variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Prev week</Button>
        <span className="text-sm font-medium">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}</span>
        <Button variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next week →</Button>
      </Card>

      <Card className="overflow-x-auto p-3">
        <div className="min-w-[720px]">
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
            <div />
            {days.map((d) => (
              <div key={d.toISOString()} className={`pb-2 text-center text-xs ${isSameDay(d, new Date()) ? 'text-primary font-semibold' : 'text-txt-muted'}`}>
                {format(d, 'EEE')}<br /><span className="text-sm">{format(d, 'd')}</span>
              </div>
            ))}
            {HOURS.map((h) => (
              <div key={h} className="contents">
                <div className="border-t border-border py-3 pr-2 text-right text-[11px] text-txt-muted">{h}:00</div>
                {days.map((d) => {
                  const items = bookingsAt(d, h);
                  return (
                    <div key={d.toISOString() + h} onClick={() => !items.length && openSlot(d, h)}
                      className={`min-h-[44px] border-t border-l border-border/60 p-0.5 ${!items.length ? 'cursor-pointer hover:bg-primary/5' : ''}`}>
                      {items.map((b) => (
                        <div key={b.id} className="rounded-md px-1.5 py-1 text-[10px] leading-tight" style={{ background: '#60A5FA22', color: '#93c5fd' }} title={`${b.bookedBy.name}: ${fmtTime(b.startTime)}-${fmtTime(b.endTime)}`}>
                          <span className="font-medium">{fmtTime(b.startTime)}–{fmtTime(b.endTime)}</span><br />{b.bookedBy.name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Existing bookings list */}
      <Card className="mt-4 p-4">
        <h3 className="mb-2 text-sm font-medium">This week’s bookings</h3>
        <div className="divide-y divide-border text-sm">
          {bookings?.length ? bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2">
              <span>{format(new Date(b.startTime), 'EEE d, HH:mm')} – {fmtTime(b.endTime)} · <span className="text-txt-muted">{b.bookedBy.name}</span>{b.purpose && <span className="text-txt-muted"> · {b.purpose}</span>}</span>
              <div className="flex items-center gap-2">
                <Pill style={BOOKING_STATUS[b.status]} />
                {b.status === 'UPCOMING' && <BookingCancel id={b.id} />}
              </div>
            </div>
          )) : <p className="py-3 text-center text-txt-muted">No bookings this week — click a slot to book.</p>}
        </div>
      </Card>

      {slot && <BookModal resourceId={activeResource} slot={slot} conflict={conflict} setConflict={setConflict} onClose={() => setSlot(null)} />}
    </div>
  );
}

function BookingCancel({ id }: { id: string }) {
  const m = useBookingMutations();
  return <button onClick={() => m.cancel.mutate(id, { onSuccess: () => toast.success('Booking cancelled') })} className="text-txt-muted hover:text-danger"><X size={14} /></button>;
}

function toLocalInput(d: Date) { return format(d, "yyyy-MM-dd'T'HH:mm"); }

function BookModal({ resourceId, slot, conflict, setConflict, onClose }: any) {
  const m = useBookingMutations();
  const [start, setStart] = useState(toLocalInput(slot.start));
  const [end, setEnd] = useState(toLocalInput(slot.end));
  const [purpose, setPurpose] = useState('');

  const book = async () => {
    setConflict(null);
    try {
      await m.create.mutateAsync({ resourceId, startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(), purpose });
      toast.success('Booking confirmed'); onClose();
    } catch (e) {
      const err = apiError(e);
      if (err.code === 'BOOKING_OVERLAP') setConflict(err.details?.conflict);
      else toast.error(err.message);
    }
  };

  return (
    <Modal open onClose={onClose} title="Book a slot">
      <div className="space-y-3">
        {conflict && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <div className="flex items-center gap-2 font-medium"><AlertTriangle size={15} /> Requested {fmtTime(start)}–{fmtTime(end)} — conflict: slot is unavailable</div>
            <p className="mt-1 text-danger/90">Overlaps an existing booking {fmtTime(conflict.startTime)}–{fmtTime(conflict.endTime)}. Try starting at <button className="underline" onClick={() => { setStart(toLocalInput(new Date(conflict.endTime))); setEnd(toLocalInput(new Date(new Date(conflict.endTime).getTime() + 3600000))); setConflict(null); }}>{fmtTime(conflict.endTime)}</button> (nearest free).</p>
          </div>
        )}
        <Input label="Start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input label="End" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Textarea label="Purpose (optional)" rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={book} loading={m.create.isPending}><CalendarPlus size={16} /> Book a slot</Button></div>
      </div>
    </Modal>
  );
}
