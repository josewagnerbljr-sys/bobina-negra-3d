import { createFileRoute } from "@tanstack/react-router";
import { Bobina } from "@/components/Bobina";

export const Route = createFileRoute("/")({
  component: Bobina,
});
