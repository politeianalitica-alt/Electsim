import { redirect } from "next/navigation";

export default function WorkspaceRootPage({ params }: { params: { workspaceId: string } }) {
  redirect(`/workspaces/${params.workspaceId}/overview`);
}
