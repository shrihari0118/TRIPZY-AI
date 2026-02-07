const USER_TYPE_OPTIONS = [
  { id: "women", label: "Women" },
  { id: "foreign-travellers", label: "Foreign Travellers" },
  { id: "temple-travellers", label: "Temple Travellers" },
  { id: "tourists", label: "Tourists" },
] as const;

export type UserType = (typeof USER_TYPE_OPTIONS)[number]["id"];

const USER_TYPE_LABELS: Record<UserType, string> = {
  "women": "Women",
  "foreign-travellers": "Foreign Travellers",
  "temple-travellers": "Temple Travellers",
  "tourists": "Tourists",
};

const USER_TYPE_SET = new Set<UserType>(
  USER_TYPE_OPTIONS.map((option) => option.id),
);

export const isUserType = (value: string | null): value is UserType =>
  value !== null && USER_TYPE_SET.has(value as UserType);

type UserTypeToggleProps = {
  selectedType: UserType | null;
  onChange: (nextType: UserType | null) => void;
  variant?: "header" | "panel";
  showLabel?: boolean;
};

export default function UserTypeToggle({
  selectedType,
  onChange,
  variant = "panel",
  showLabel,
}: UserTypeToggleProps) {
  const currentLabel = selectedType ? USER_TYPE_LABELS[selectedType] : "General";
  const isHeader = variant === "header";
  const shouldShowLabel = showLabel ?? !isHeader;

  return (
    <div
      className={`${
        isHeader
          ? "rounded-full border border-white/40 bg-white/70 px-2 py-1 shadow-sm backdrop-blur"
          : "rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur"
      }`}
    >
      <div
        className={`flex flex-col gap-3 ${
          isHeader ? "sm:flex-row sm:items-center" : "sm:flex-row sm:items-center sm:justify-between"
        }`}
      >
        {shouldShowLabel ? (
          <div className="text-left">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-400">
              User Type
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {currentLabel}
              <span className="ml-2 text-xs font-medium text-slate-500">
                profile
              </span>
            </p>
          </div>
        ) : null}
        <div
          role="group"
          aria-label="Select user type"
          className={`flex flex-wrap items-center ${
            isHeader
              ? "gap-1.5 rounded-full bg-white/60 p-1"
              : "gap-2 rounded-full bg-slate-100 p-1"
          }`}
        >
          {USER_TYPE_OPTIONS.map((option) => {
            const isActive = selectedType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(isActive ? null : option.id)}
                aria-pressed={isActive}
                className={`rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                  isHeader ? "px-2.5 py-1 text-[0.7rem]" : "px-3 py-1.5 text-xs"
                } ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
