"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
export const PrintButton = () => <Button variant="outline" onClick={() => window.print()}><Printer />Print / save PDF</Button>;
