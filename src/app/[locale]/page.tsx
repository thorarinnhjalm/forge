import {getTranslations, setRequestLocale} from 'next-intl/server';
import LandingHero from '@/components/landing/LandingHero';

export default async function Home({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations('LandingPage');

  return (
    <main className="landing-main">
      <LandingHero 
        title={t('title')} 
        description={t('description')} 
        ctaText={t('cta')} 
      />
    </main>
  );
}
