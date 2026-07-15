import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main>
      <h1>Home</h1>
      <p>
        <Link to="/dashboard">Go to User Dashboard</Link>
      </p>
    </main>
  );
}
