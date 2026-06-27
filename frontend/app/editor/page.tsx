"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("checking,,,");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);
  return (
    <div className="flex flex-col min-h-screen flex-1 items-center justify-center font-sans bg-neutral-900">
      <p className="text-4xl text-white">Backend Status:-{status}</p>
    </div>
  );
}
