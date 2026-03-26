import ItineraryLayout from '../../components/ItineraryLayout';
import { useTripContext } from '../../context/TripContext';

const MEAL_ROTATION = [
  ['Breakfast', 'Lunch'],
  ['Lunch', 'Dinner'],
  ['Breakfast', 'Dinner'],
];

export default function FoodPage() {
  const { selectedTrip } = useTripContext();

  if (!selectedTrip) {
    return (
      <ItineraryLayout title="Food Plan" previousPath="/budget-results">
        <EmptyState message="No itinerary selected. Please choose a budget plan first." />
      </ItineraryLayout>
    );
  }

  const restaurants = selectedTrip.result.food.map((name, index) => ({
    name,
    mealTypes: MEAL_ROTATION[index % MEAL_ROTATION.length],
    hasTableBooking: index % 2 === 0,
  }));

  return (
    <ItineraryLayout
      title="Food Plan"
      previousPath="/itinerary/accommodation"
      nextPath="/itinerary/tourist"
    >
      <section className="grid gap-6">
        {restaurants.map((restaurant) => (
          <article
            key={restaurant.name}
            className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">{restaurant.name}</h2>
                <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                  {restaurant.mealTypes.map((mealType) => (
                    <li key={mealType} className="rounded-2xl bg-[var(--panel-muted)] px-4 py-3">
                      Meal Type: {mealType}
                    </li>
                  ))}
                </ul>
              </div>

              {restaurant.hasTableBooking && (
                <button
                  type="button"
                  className="rounded-2xl border border-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-soft)]"
                >
                  Book Table
                </button>
              )}
            </div>
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
