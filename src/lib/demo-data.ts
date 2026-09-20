import type { ResumeData } from '@/types/resume';

/**
 * SAMPLE DEMO DATA — purely illustrative sample content for trying the builder.
 * Clearly labeled as sample data in the UI and never mixed into real resumes
 * unless the user explicitly loads it.
 */
export const DEMO_RESUME_DATA: ResumeData = {
  personal: {
    fullName: 'Arjun Sharma',
    professionalTitle: 'Software Developer',
    email: 'arjun.sharma@example.com',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    linkedin: 'https://linkedin.com/in/arjansharma',
    github: 'https://github.com/arjansharma',
    portfolio: 'https://arjansharma.dev',
  },
  objective: '',
  summary:
    'Software developer with hands-on experience building and shipping full-stack web applications using Python, JavaScript and React. Completed a 6-month internship where I contributed to production features used by thousands of users. Strong foundation in data structures, REST APIs and SQL databases, with a growing interest in cloud deployment.',
  education: [
    {
      id: 'demo-edu-1',
      degree: 'B.Tech in Computer Science and Engineering',
      institution: 'Visvesvaraya Technological University',
      location: 'Bengaluru, India',
      startYear: '2021',
      endYear: '2025',
      score: 'CGPA: 8.6/10',
    },
    {
      id: 'demo-edu-2',
      degree: 'Pre-University (PCMC)',
      institution: 'Kendriya Vidyalaya',
      location: 'Mysuru, India',
      startYear: '2019',
      endYear: '2021',
      score: '92%',
    },
  ],
  skills: {
    languages: ['Python', 'JavaScript', 'Java', 'TypeScript', 'SQL'],
    frameworks: ['React', 'Next.js', 'Django', 'Node.js', 'Express'],
    databases: ['MySQL', 'PostgreSQL', 'MongoDB'],
    tools: ['Git', 'Docker', 'Postman', 'VS Code', 'Jira'],
    cloud: ['AWS (EC2, S3)', 'Vercel'],
    soft: ['Teamwork', 'Communication', 'Problem Solving', 'Time Management'],
  },
  experience: [
    {
      id: 'demo-exp-1',
      jobTitle: 'Software Developer Intern',
      company: 'TechNova Solutions Pvt. Ltd.',
      location: 'Bengaluru, India',
      startDate: 'Jan 2024',
      endDate: 'Jun 2024',
      description:
        'Developed and tested REST API endpoints in Django for the customer dashboard, reducing average response time for key queries.\nBuilt reusable React components for the reporting module used across 3 internal tools.\nWrote unit tests and documented 15+ API endpoints, improving onboarding for new team members.\nParticipated in weekly code reviews and agile ceremonies.',
    },
  ],
  internships: [
    {
      id: 'demo-int-1',
      title: 'Web Development Intern',
      company: 'TechNova Solutions Pvt. Ltd.',
      duration: '6 months (Jan 2024 - Jun 2024)',
      location: 'Bengaluru, India',
      description:
        'Worked with the product team to ship 8+ features for a SaaS analytics dashboard.\nCleaned and transformed raw CSV datasets using Python (pandas) to improve data quality for reporting.',
      technologies: 'Python, Django, React, MySQL, Docker',
    },
  ],
  projects: [
    {
      id: 'demo-proj-1',
      name: 'CampusEvents — College Event Management Portal',
      description:
        'Built a full-stack event management portal where students can discover, register and organize campus events.\nImplemented JWT authentication, event RSVP flows and an admin dashboard with React and Django REST Framework.\nDeployed on AWS EC2 with a PostgreSQL database; handled 500+ registrations during the first fest week.',
      role: 'Team Lead (3 members)',
      technologies: 'React, Django REST Framework, PostgreSQL, AWS',
      githubUrl: 'https://github.com/arjansharma/campusevents',
      liveUrl: 'https://campusevents.demo',
    },
    {
      id: 'demo-proj-2',
      name: 'ExpenseWise — Personal Finance Tracker',
      description:
        'Developed a responsive expense tracking web app with charts for monthly spending categories.\nImplemented data visualization using Recharts and local-first storage with offline support.',
      role: 'Solo Developer',
      technologies: 'TypeScript, Next.js, Recharts, Tailwind CSS',
      githubUrl: 'https://github.com/arjansharma/expensewise',
      liveUrl: '',
    },
  ],
  certifications: [
    {
      id: 'demo-cert-1',
      name: 'AWS Certified Cloud Practitioner',
      organization: 'Amazon Web Services',
      date: 'Mar 2024',
      credentialUrl: 'https://aws.amazon.com/verification',
    },
    {
      id: 'demo-cert-2',
      name: 'Full Stack Web Development Specialization',
      organization: 'Coursera',
      date: 'Nov 2023',
      credentialUrl: '',
    },
  ],
  achievements: [
    {
      id: 'demo-ach-1',
      title: 'Winner, Smart India Hackathon (Internal Round)',
      description: 'Led a 4-member team that built a prototype for a civic issue reporting system.',
    },
    {
      id: 'demo-ach-2',
      title: 'Top 5%, Data Structures Course',
      description: '',
    },
  ],
  languages: [
    { id: 'demo-lang-1', language: 'English', proficiency: 'Professional' },
    { id: 'demo-lang-2', language: 'Hindi', proficiency: 'Native' },
    { id: 'demo-lang-3', language: 'Kannada', proficiency: 'Intermediate' },
  ],
};

export const DEMO_NOTE =
  'This is sample demo data for exploring the app. Replace it with your real information before downloading.';
