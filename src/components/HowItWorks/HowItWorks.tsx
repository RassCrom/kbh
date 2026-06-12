import { Satellite, Cpu, BarChart3, Globe } from 'lucide-react';
import s from './HowItWorks.module.scss';

const STEPS = [
  {
    icon: Satellite,
    number: '01',
    title: 'Data Collection',
    desc: 'Buildings footprints from OSM.',
  },
  {
    icon: Cpu,
    number: '02',
    title: 'Processing & Analysis',
    desc: 'Data is gathered from advertisement websites, open source, googling and using Google Earth Pro.',
  },
  {
    icon: BarChart3,
    number: '03',
    title: 'Visualization & Stories',
    desc: 'We have collected interactive map, interesting data, engaging guided tours, and more analysis on the map. All visualized through or connected to buildings of Astana.',
  },
];

const SOURCES = [
  { icon: Globe, label: 'OpenStreetMap' },
  { icon: Satellite, label: 'Google Earth Pro' },
  { icon: BarChart3, label: 'Ad websites' },
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
