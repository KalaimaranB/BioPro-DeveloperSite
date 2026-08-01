import AnimatedHero from '@/components/AnimatedHero/AnimatedHero';

export default function HomePage() {
  return (
    <div className="container" style={{ minHeight: 'calc(100vh - 70px)' }}>
      <AnimatedHero />
    </div>
  );
}
