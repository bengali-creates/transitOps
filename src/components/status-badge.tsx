import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "available":
      return <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>;
    case "on_trip":
      return <Badge className="bg-blue-500 hover:bg-blue-600">On Trip</Badge>;
    case "in_shop":
      return <Badge className="bg-orange-500 hover:bg-orange-600">In Shop</Badge>;
    case "retired":
      return <Badge className="bg-red-500 hover:bg-red-600">Retired</Badge>;
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "dispatched":
      return <Badge className="bg-indigo-500 hover:bg-indigo-600">Dispatched</Badge>;
    case "completed":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>;
    case "cancelled":
      return <Badge className="bg-rose-500 hover:bg-rose-600">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
