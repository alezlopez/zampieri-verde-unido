import { useEffect } from "react";

const ManualDaFamilia = () => {
  useEffect(() => {
    document.title = "Manual da Família 2027 — Colégio Zampieri";
  }, []);

  return (
    <iframe
      src="/manual-da-familia-2027.html"
      title="Manual da Família 2027 — Colégio Zampieri"
      className="w-full h-screen border-0"
    />
  );
};

export default ManualDaFamilia;
