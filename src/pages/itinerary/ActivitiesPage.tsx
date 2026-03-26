import ItineraryLayout from '../../components/ItineraryLayout';
import { useTripContext } from '../../context/TripContext';

export default function ActivitiesPage() {
  const { selectedTrip } = useTripContext();

  if (!selectedTrip) {
    return (
      <ItineraryLayout title="Activities and Entertainment" previousPath="/budget-results">
        <EmptyState message="No itinerary selected. Please choose a budget plan first." />
      </ItineraryLayout>
    );
  }

  const items = [...selectedTrip.result.activities, ...selectedTrip.result.entertainment].map(
    (name, index) => ({
      name,
      fee: index % 2 === 0 ? 150 + index * 75 : 0,
    })
  );

  return (
    <ItineraryLayout
      title="Activities and Entertainment"
      previousPath="/itinerary/tourist"
    >
      <section className="grid gap-6">
        {items.map(({ name, fee }) => (
          <article
            key={name}
            className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[var(--ink)]">{name}</h2>
            <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <li className="rounded-2xl bg-[var(--panel-muted)] px-4 py-3">
                {fee > 0
                  ? `Entry Fee: \u20B9${fee.toLocaleString('en-IN')}`
                  : 'Entry Fee: Included in the itinerary'}
              </li>
              <li className="rounded-2xl bg-[var(--panel-muted)] px-4 py-3">
                {fee > 0 ? 'Advance payment recommended' : 'No extra payment required'}
              </li>
            </ul>
          </article>
        ))}
      </section>
    </ItineraryLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
      {message}
    </section>
  );
}
