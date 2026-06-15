import BottomNav from '@/components/ui/BottomNav'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-[#F0FAFA] shadow-sm">
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
