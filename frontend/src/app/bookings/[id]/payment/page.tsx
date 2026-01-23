import { redirect } from "next/navigation";

interface BookingPaymentRedirectPageProps {
  params: {
    id: string;
  };
}

export default function BookingPaymentRedirectPage({
  params,
}: BookingPaymentRedirectPageProps) {
  redirect(`/booking/${params.id}/payment`);
}
