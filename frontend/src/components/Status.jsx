const statusLabels = {
  available: "Available",
  unavailable: "Unavailable",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Status({ status }) {
  const normalizedStatus = String(status || "pending").toLowerCase();
  const label = statusLabels[normalizedStatus] || status;

  return (
    <span className={`status status-${normalizedStatus}`} role="status">
      {label}
    </span>
  );
}
