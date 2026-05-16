import s from './Team.module.scss';

const TEAM = [
  {
    initials: 'AB',
    name: 'Alikhan B.',
    role: 'Ideas & data visualization',
    bio: 'Data visualization, map maker, storyteller',
    bg: 'linear-gradient(135deg, rgba(77, 138, 173, 0.15), rgba(212, 168, 94, 0.1))',
  },
  {
    initials: 'TA',
    name: 'Tolegen A.',
    role: 'GIS researcher',
    bio: 'Seasoned GIS specialist with teaching experience in Urban ecology. Focus on socio-economic urban enviroments.',
    bg: 'linear-gradient(135deg, rgba(212, 168, 94, 0.15), rgba(143, 80, 64, 0.1))',
  },
];

export default function Team() {
  return (
    <section className={s.team} id="team">
      <div className={s.inner}>
        <span className={s.tag}>06 · About</span>
        <h2 className={s.heading}>The Team Behind the Data</h2>
        <p className={s.mission}>
          We believe urban history should be open, visual, and interactive. Our small team 
          combines architecture research, data engineering, and design to make Astana's 
          building heritage explorable by anyone.
        </p>

        <div className={s.grid}>
          {TEAM.map((member) => (
            <div className={s.card} key={member.initials} id={`member-${member.initials.toLowerCase()}`}>
              <div className={s.avatar} style={{ background: member.bg }}>
                {member.initials}
              </div>
              <h3 className={s.name}>{member.name}</h3>
              <span className={s.role}>{member.role}</span>
              <p className={s.bio}>{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
