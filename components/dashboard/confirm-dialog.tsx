// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm?: () => void | Promise<void>;
  }>({ open: false, title: "", description: "" });

  const confirm = (
    opts: { title: string; description: string; confirmLabel?: string },
    onConfirm: () => void | Promise<void>
  ) => {
    setState({ open: true, ...opts, onConfirm });
  };

  return {
    confirm,
    dialog: (
      <AlertDialog open={state.open} onOpenChange={(open) => setState((s) => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await state.onConfirm?.();
                } finally {
                  setState((s) => ({ ...s, open: false }));
                }
              }}
            >
              {state.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
  };
}
