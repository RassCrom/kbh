import s from './Team.module.scss';

const TEAM = [
  {
    initials: 'AB',
    name: 'Alikhan B.',
    role: 'Ideas & Data Visualization',
    bio: 'Experienced map maker and data visualization specialist.'
  },
  {
    initials: 'TA',
    name: 'Tolegen A.',
    role: 'Data collection and GIS research',
    bio: 'Seasoned (Middle) GIS specialist with teaching experience in Urban ecology. Focus on socio-economic urban environments.'
  },
];

export default function Team() {
  return (
    <section className={s.team} id="team">
      <div className={s.inner}>
        <span className={s.tag}>06 · About</span>
        <h2 className={s.heading}>The Team Behind the Data</h2>
        <p className={s.mission}>
          We were inspired by how old is this building, a project started by Nikita Slavin and decided to make it for our hometown.
          Now Astana's buildings visualized. Although collection is still going. Many missing data.
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
