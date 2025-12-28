/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { formatDuration, formatNumber } from '../utils/formatters.js';
import {
  calculateAverageLatency,
  calculateCacheHitRate,
  calculateErrorRate,
} from '../utils/computeStats.js';
import { useSessionStats } from '../contexts/SessionContext.js';
import { Table, type Column } from './Table.js';

interface StatRowData {
  metric: string;
  isSection?: boolean;
  isSubtle?: boolean;
  // Dynamic keys for model values
  [key: string]: string | React.ReactNode | boolean | undefined;
}

export const ModelStatsDisplay: React.FC = () => {
  const { stats } = useSessionStats();
  const { models } = stats.metrics;
  const activeModels = Object.entries(models).filter(
    ([, metrics]) => metrics.api.totalRequests > 0,
  );

  if (activeModels.length === 0) {
    return (
      <Box
        borderStyle="round"
        borderColor={theme.border.default}
        paddingY={1}
        paddingX={2}
      >
        <Text color={theme.text.primary}>
          No API calls have been made in this session.
        </Text>
      </Box>
    );
  }

  const modelNames = activeModels.map(([name]) => name);

  const hasThoughts = activeModels.some(
    ([, metrics]) => metrics.tokens.thoughts > 0,
  );
  const hasTool = activeModels.some(([, metrics]) => metrics.tokens.tool > 0);
  const hasCached = activeModels.some(
    ([, metrics]) => metrics.tokens.cached > 0,
  );

  // Helper to create a row with values for each model
  const createRow = (
    metric: string,
    getValue: (
      metrics: (typeof activeModels)[0][1],
    ) => string | React.ReactNode,
    options: { isSection?: boolean; isSubtle?: boolean } = {},
  ): StatRowData => {
    const row: StatRowData = {
      metric,
      isSection: options.isSection,
      isSubtle: options.isSubtle,
    };
    activeModels.forEach(([name, metrics]) => {
      row[name] = getValue(metrics);
    });
    return row;
  };

  const rows: StatRowData[] = [
    // API Section
    { metric: 'API', isSection: true },
    createRow('Requests', (m) => formatNumber(m.api.totalRequests)),
    createRow('Errors', (m) => {
      const errorRate = calculateErrorRate(m);
      return (
        <Text
          color={
            m.api.totalErrors > 0 ? theme.status.error : theme.text.primary
          }
        >
          {formatNumber(m.api.totalErrors)} ({errorRate.toFixed(1)}%)
        </Text>
      );
    }),
    createRow('Avg Latency', (m) => formatDuration(calculateAverageLatency(m))),

    // Spacer
    { metric: '' },

    // Tokens Section
    { metric: 'Tokens', isSection: true },
    createRow('Total', (m) => (
      <Text color={theme.text.secondary}>{formatNumber(m.tokens.total)}</Text>
    )),
    createRow(
      'Input',
      (m) => (
        <Text color={theme.text.primary}>{formatNumber(m.tokens.input)}</Text>
      ),
      { isSubtle: true },
    ),
  ];

  if (hasCached) {
    rows.push(
      createRow(
        'Cache Reads',
        (m) => {
          const cacheHitRate = calculateCacheHitRate(m);
          return (
            <Text color={theme.text.secondary}>
              {formatNumber(m.tokens.cached)} ({cacheHitRate.toFixed(1)}%)
            </Text>
          );
        },
        { isSubtle: true },
      ),
    );
  }

  if (hasThoughts) {
    rows.push(
      createRow(
        'Thoughts',
        (m) => (
          <Text color={theme.text.primary}>
            {formatNumber(m.tokens.thoughts)}
          </Text>
        ),
        { isSubtle: true },
      ),
    );
  }

  if (hasTool) {
    rows.push(
      createRow(
        'Tool',
        (m) => (
          <Text color={theme.text.primary}>{formatNumber(m.tokens.tool)}</Text>
        ),
        { isSubtle: true },
      ),
    );
  }

  rows.push(
    createRow(
      'Output',
      (m) => (
        <Text color={theme.text.primary}>
          {formatNumber(m.tokens.candidates)}
        </Text>
      ),
      { isSubtle: true },
    ),
  );

  const columns: Array<Column<StatRowData>> = [
    {
      key: 'metric',
      header: 'Metric',
      width: 28,
      renderCell: (row) => (
        <Text
          bold={row.isSection}
          color={row.isSection ? theme.text.primary : theme.text.link}
        >
          {row.isSubtle ? `  ↳ ${row.metric}` : row.metric}
        </Text>
      ),
    },
    ...modelNames.map((name) => ({
      key: name,
      header: name,
      flexGrow: 1,
      renderCell: (row: StatRowData) => {
        // Don't render anything for section headers in model columns
        if (row.isSection) return null;
        const val = row[name];
        if (val === undefined || val === null) return null;
        if (typeof val === 'string' || typeof val === 'number') {
          return <Text color={theme.text.primary}>{val}</Text>;
        }
        return val as React.ReactNode;
      },
    })),
  ];

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      paddingY={1}
      paddingX={2}
    >
      <Text bold color={theme.text.accent}>
        Model Stats For Nerds
      </Text>
      <Box height={1} />
      <Table data={rows} columns={columns} />
    </Box>
  );
};
