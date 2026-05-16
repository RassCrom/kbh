import { Satellite, Cpu, BarChart3, Globe, Database, FileJson, MapPin } from 'lucide-react';
import s from './HowItWorks.module.scss';

const STEPS = [
  {
    icon: Satellite,
    number: '01',
    title: 'Data Collection',
    desc: 'Building footprints, construction dates, and architectural metadata are gathered from OpenStreetMap, government registries, and satellite imagery.',
  },
  {
    icon: Cpu,
    number: '02',
    title: 'Processing & Analysis',
    desc: 'Raw data is cleaned, geo-coded, and enriched with era classifications. Machine learning helps estimate construction dates for undocumented structures.',
  },
  {
    icon: BarChart3,
    number: '03',
    title: 'Visualization & Stories',
    desc: 'Interactive maps, scrollytelling articles, and guided tours bring the data to life — revealing the urban DNA of Astana across nine historical eras.',
  },
];

const SOURCES = [
  { icon: Globe, label: 'OpenStreetMap' },
  { icon: Database, label: 'KZ Gov Registry' },
  { icon: Satellite, label: 'Sentinel-2' },
  { icon: FileJson, label: 'GeoJSON Sources' },
  { icon: BarChart3, label: 'Statistical Bureau' },
];

export default function HowItWorks() {
  return (
    <section className={s.section} id="how-it-works">
      <div className={s.inner}>
        <span className={s.tag}>05 · Methodology</span>
        <h2 className={s.heading}>How It Works</h2>
        <p className={s.subtitle}>
          From raw geospatial data to interactive urban narratives — a transparent pipeline.
        </p>

        <div className={s.pipeline}>
          {STEPS.map((step, i) => (
            <div className={s.step} key={step.number} id={`step-${step.number}`}>
              <span className={s.stepNumber}>{step.number}</span>
              <div className={s.stepIcon}>
                <step.icon size={24} />
              </div>
              <h3 className={s.stepTitle}>{step.title}</h3>
              <p className={s.stepDesc}>{step.desc}</p>
              {i < STEPS.length - 1 && <div className={s.connector} />}
            </div>
          ))}
        </div>

        <div className={s.sources}>
          <h3 className={s.sourcesTitle}>Data Sources</h3>
          <div className={s.sourceGrid}>
            {SOURCES.map((src) => (
              <span className={s.source} key={src.label}>
                <src.icon size={14} /> {src.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
