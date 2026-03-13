import type { AdminNavItem, ScenarioTemplate } from '@resilience/shared';

export const adminNav: AdminNavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'source-library', label: 'Source Library' },
  { id: 'org-context', label: 'Organization Context' },
  { id: 'scenario-studio', label: 'Scenario Studio' },
  { id: 'roster', label: 'Roster' },
  { id: 'launches', label: 'Launches' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

export const scenarioTemplates: ScenarioTemplate[] = [
  {
    id: 'cyber-incident-escalation',
    name: 'Cyber Incident Escalation',
    description: 'Cross-functional response to identity, endpoint, or vendor compromise.',
    recommendedInputs: ['IR playbook', 'Escalation matrix', 'Vendor list'],
    primaryAudience: 'Operations + Compliance',
  },
  {
    id: 'critical-vendor-outage',
    name: 'Critical Vendor Outage',
    description: 'Dependency disruption affecting transaction processing or core workflow continuity.',
    recommendedInputs: ['Vendor matrix', 'Continuity plan', 'Escalation matrix'],
    primaryAudience: 'Operations + Leadership',
  },
  {
    id: 'executive-tabletop',
    name: 'Executive Tabletop',
    description: 'Facilitator-led exercise for leadership decision-making under pressure.',
    recommendedInputs: ['Continuity plan', 'Communications playbook', 'Escalation matrix'],
    primaryAudience: 'Executive Team',
  },
];
