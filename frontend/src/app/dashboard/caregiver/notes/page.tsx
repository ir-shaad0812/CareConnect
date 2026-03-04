"use client";

import CaregiverLayout from "../components/CaregiverLayout";
import NotesPage from "@/components/features/notes/NotesPage";

export default function CaregiverNotesPage() {
  return (
    <CaregiverLayout>
      <NotesPage userRole="caregiver" />
    </CaregiverLayout>
  );
}
