"use client";

import { useParams } from "next/navigation";
import { CollectionWorkspace } from "@/components/erp/CollectionWorkspace";

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  return <CollectionWorkspace id={id} />;
}
