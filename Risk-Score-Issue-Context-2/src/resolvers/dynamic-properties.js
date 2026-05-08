import api, { route } from '@forge/api';

const mapRisk = (priorityName = '') => {
  const p = priorityName.toLowerCase();
  if (p === 'highest' || p === 'critical') {
    return { label: 'High Risk', type: 'removed' };
  }
  if (p === 'high') {
    return { label: 'Medium Risk', type: 'moved' };
  }
  return { label: 'Low Risk', type: 'success' };
};

export const getDynamicProperties = async (payload) => {
  const issueKey = payload?.extension?.issue?.key;
  if (!issueKey) {
    return {
      label: { value: 'Risk Score' },
      status: { type: 'lozenge', value: { label: 'Low Risk', type: 'success' } },
    };
  }

  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${issueKey}?fields=priority`, {
      headers: { Accept: 'application/json' },
    });

  if (!res.ok) {
    return {
      label: { value: 'Risk Score' },
      status: { type: 'lozenge', value: { label: 'Low Risk', type: 'success' } },
    };
  }

  const data = await res.json();
  const priorityName = data?.fields?.priority?.name ?? '';
  const risk = mapRisk(priorityName);

  return {
    label: { value: 'Risk Score' },
    status: {
      type: 'lozenge',
      value: {
        label: risk.label,
        type: risk.type,
      },
    },
  };
};