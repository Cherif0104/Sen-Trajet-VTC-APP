"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { driverUpdateMission } from "@/server/actions/driver";

export function MissionStepForm({ missionId, step }: { missionId: string; step: "start" | "finish" }) {
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      action={(fd) =>
        start(async () => {
          try {
            const res = await driverUpdateMission(fd);
            if (!res.ok) return void toast.error(res.message ?? "Action impossible.");
            toast.success(step === "start" ? "Mission démarrée." : "Mission terminée.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Action impossible.");
          }
        })
      }
    >
      <input type="hidden" name="missionId" value={missionId} />
      <input type="hidden" name="step" value={step} />
      <Input name="mileage" type="number" inputMode="numeric" placeholder={step === "start" ? "Km départ" : "Km arrivée"} className="h-10 bg-white" aria-label="Kilométrage" />
      <Button type="submit" disabled={pending} className="h-10 shrink-0 px-4">
        {step === "start" ? "Démarrer" : "Terminer"}
      </Button>
    </form>
  );
}
