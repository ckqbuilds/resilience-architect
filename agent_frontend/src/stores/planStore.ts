import type { ExperimentRow } from '../types.js';

let localPlans: ExperimentRow[] = [];
let awsExperiments: ExperimentRow[] = [];

export function getLocalPlans(): ExperimentRow[] {
  return localPlans;
}

export function getAwsExperiments(): ExperimentRow[] {
  return awsExperiments;
}

export function getAllExperiments(): ExperimentRow[] {
  return [...localPlans, ...awsExperiments];
}

export function setLocalPlans(plans: ExperimentRow[]): void {
  localPlans = plans;
}

export function setAwsExperiments(experiments: ExperimentRow[]): void {
  awsExperiments = experiments;
}

export function clearPlans(): void {
  localPlans = [];
  awsExperiments = [];
}

export function filterExperiments(
  list: ExperimentRow[],
  query: string
): ExperimentRow[] {
  if (!query.trim()) return list;
  const search = query.toLowerCase();
  return list.filter((e) => {
    const searchable = `${e.source} ${e.name} ${e.status} ${e.riskLevel} ${e.targets} ${e.duration}`.toLowerCase();
    return searchable.includes(search);
  });
}
