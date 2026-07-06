"use client";

interface IMain {
  children: React.ReactNode;
}

export default function Main({ children }: IMain) {
  return (
    <main className="h-full overflow-y-auto">
      <div className="container grid px-6 mx-auto py-6">{children}</div>
    </main>
  );
}
