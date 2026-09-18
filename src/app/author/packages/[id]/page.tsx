import { redirect } from "next/navigation";

export default function AuthorPackageRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/pembuat/paket/${params.id}`);
}
