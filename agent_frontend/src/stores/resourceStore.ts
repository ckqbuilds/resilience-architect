import type { Resource, FilterQuery } from '../types.js';

let resources: Resource[] = [];

export function getResources(): Resource[] {
  return resources;
}

export function addResources(newResources: Resource[]): void {
  for (const nr of newResources) {
    const existingIndex = resources.findIndex(
      (r) => r.id === nr.id && r.service === nr.service && r.region === nr.region
    );
    if (existingIndex >= 0) {
      resources[existingIndex] = nr;
    } else {
      resources.push(nr);
    }
  }
}

export function clearResources(): void {
  resources = [];
}

export function toggleResourceSelection(id: string): void {
  const resource = resources.find((r) => r.id === id);
  if (resource) {
    resource.selected = !resource.selected;
  }
}

export function getSelectedResources(): Resource[] {
  return resources.filter((r) => r.selected);
}

export function filterResources(query: FilterQuery): Resource[] {
  return resources.filter((r) => {
    if (query.service && r.service.toLowerCase() !== query.service.toLowerCase()) {
      return false;
    }
    if (query.status && r.status.toLowerCase() !== query.status.toLowerCase()) {
      return false;
    }
    if (query.tag) {
      const tagValue = r.tags[query.tag.key];
      if (!tagValue || tagValue.toLowerCase() !== query.tag.value.toLowerCase()) {
        return false;
      }
    }
    if (query.text) {
      const search = query.text.toLowerCase();
      const searchable = `${r.service} ${r.name} ${r.id} ${r.status} ${r.region} ${Object.entries(r.tags).map(([k, v]) => `${k}=${v}`).join(' ')}`.toLowerCase();
      if (!searchable.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

export function sortResources(list: Resource[], column: keyof Resource): Resource[] {
  return [...list].sort((a, b) => {
    const aVal = typeof a[column] === 'string' ? (a[column] as string) : JSON.stringify(a[column]);
    const bVal = typeof b[column] === 'string' ? (b[column] as string) : JSON.stringify(b[column]);
    return aVal.localeCompare(bVal);
  });
}

export function parseFilter(input: string): FilterQuery {
  const query: FilterQuery = {};
  const parts = input.split(/\s+/);
  const textParts: string[] = [];

  for (const part of parts) {
    if (part.startsWith('service:')) {
      query.service = part.slice(8);
    } else if (part.startsWith('tag:')) {
      const tagExpr = part.slice(4);
      const eqIndex = tagExpr.indexOf('=');
      if (eqIndex > 0) {
        query.tag = { key: tagExpr.slice(0, eqIndex), value: tagExpr.slice(eqIndex + 1) };
      }
    } else if (part.startsWith('status:')) {
      query.status = part.slice(7);
    } else if (part.length > 0) {
      textParts.push(part);
    }
  }

  if (textParts.length > 0) {
    query.text = textParts.join(' ');
  }

  return query;
}

export function parseResourcesFromEvents(events: Array<{ tool_name?: string; tool_input?: Record<string, any>; result?: string }>): Resource[] {
  const parsed: Resource[] = [];

  for (const event of events) {
    if (event.tool_name !== 'use_aws' || !event.result) continue;

    try {
      const result = typeof event.result === 'string' ? JSON.parse(event.result) : event.result;
      const service = event.tool_input?.service_name || 'unknown';
      const region = event.tool_input?.region || '';

      const collections = Object.values(result).filter(Array.isArray) as any[][];
      for (const collection of collections) {
        for (const item of collection) {
          if (typeof item !== 'object' || item === null) continue;

          const name = item.Name || item.FunctionName || item.ClusterName || item.DBInstanceIdentifier || item.InstanceId || item.GroupName || item.BucketName || Object.values(item).find((v) => typeof v === 'string') || 'unnamed';
          const id = item.Arn || item.InstanceId || item.FunctionArn || item.ClusterArn || item.DBInstanceIdentifier || String(name);
          const status = item.State || item.Status || item.status || 'unknown';
          const tags: Record<string, string> = {};
          const tagList = item.Tags || item.tags || [];
          if (Array.isArray(tagList)) {
            for (const t of tagList) {
              if (t.Key && t.Value) tags[t.Key] = t.Value;
              else if (t.key && t.value) tags[t.key] = t.value;
            }
          } else if (typeof tagList === 'object') {
            Object.assign(tags, tagList);
          }

          parsed.push({
            service: service,
            name: String(name),
            id: String(id),
            status: typeof status === 'string' ? status : JSON.stringify(status),
            region,
            tags,
          });
        }
      }
    } catch {
      // Skip unparseable results
    }
  }

  return parsed;
}
