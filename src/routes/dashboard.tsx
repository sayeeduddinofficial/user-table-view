import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const users = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "Active" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Editor", status: "Active" },
  { id: 3, name: "Carol White", email: "carol@example.com", role: "Viewer", status: "Inactive" },
  { id: 4, name: "David Brown", email: "david@example.com", role: "Editor", status: "Active" },
  { id: 5, name: "Eve Davis", email: "eve@example.com", role: "Viewer", status: "Pending" },
];

function Dashboard() {
  return (
    <main>
      <h1>User Dashboard</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
