import { redirect } from "next/navigation";

interface BookingDetailRedirectPageProps {
  params: {
    id: string;
  };
}

export default function BookingDetailRedirectPage({
  params,
}: BookingDetailRedirectPageProps) {
  redirect(`/dashboard/bookings/${params.id}`);
}
