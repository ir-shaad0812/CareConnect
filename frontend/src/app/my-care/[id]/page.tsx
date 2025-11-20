import { redirect } from "next/navigation";

type MyCareBookingPageProps = {
  params: {
    id: string;
  };
};

export default function MyCareBookingPage({ params }: MyCareBookingPageProps) {
  redirect(`/my-care/${params.id}/navigate`);
}
