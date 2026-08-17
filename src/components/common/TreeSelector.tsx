import React, { useState, useMemo } from 'react';
import {
  TextField,
  InputAdornment,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Search,
  Clear,
  Folder,
} from '@mui/icons-material';

export interface TreeNode {
  id: string;
  name: string;
  parentId: string | null;
  children?: TreeNode[];
}

interface TreeSelectorProps {
  nodes: TreeNode[];
  value?: string | null;
  onChange?: (nodeId: string | null) => void;
  placeholder?: string;
  multiple?: boolean;
  selectedIds?: string[];
  onMultiChange?: (nodeIds: string[]) => void;
}

const buildTree = (nodes: TreeNode[]): TreeNode[] => {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  nodes.forEach((node) => {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(treeNode);
      }
    } else {
      roots.push(treeNode);
    }
  });

  return roots;
};

export const TreeSelector: React.FC<TreeSelectorProps> = ({
  nodes,
  value: _value,
  onChange,
  placeholder = '搜索...',
  multiple = false,
  selectedIds = [],
  onMultiChange,
}) => {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const treeData = useMemo(() => buildTree(nodes), [nodes]);

  const filteredNodes = useMemo(() => {
    if (!search) return treeData;

    const searchLower = search.toLowerCase();
    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const matches = node.name.toLowerCase().includes(searchLower);
        const filteredChildren = filterTree(node.children || []);
        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
          });
        }
        return acc;
      }, []);
    };

    return filterTree(treeData);
  }, [treeData, search]);

  const handleToggle = (nodeId: string) => {
    setExpanded((prev) =>
      prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  const handleSelect = (nodeId: string) => {
    if (multiple) {
      const newSelected = selectedIds.includes(nodeId)
        ? selectedIds.filter((id) => id !== nodeId)
        : [...selectedIds, nodeId];
      onMultiChange?.(newSelected);
    } else {
      onChange?.(nodeId);
    }
  };

  const renderItems = (items: TreeNode[], depth = 0) => {
    return items.map((node) => (
      <React.Fragment key={node.id}>
        <ListItemButton
          onClick={() => handleSelect(node.id)}
          sx={{ pl: 2 + depth * 2 }}
        >
          {node.children && node.children.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(node.id);
              }}
              sx={{ mr: 1 }}
            >
              {expanded.includes(node.id) ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
          <Folder sx={{ mr: 1, color: 'primary.main' }} />
          <ListItemText primary={node.name} />
        </ListItemButton>
        {node.children && node.children.length > 0 && (
          <Collapse in={expanded.includes(node.id)} timeout="auto" unmountOnExit>
            <List disablePadding>
              {renderItems(node.children, depth + 1)}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    ));
  };

  return (
    <Box>
      <TextField
        size="small"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
          endAdornment: search && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearch('')}>
                <Clear fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />
      <Box
        sx={{
          maxHeight: 300,
          overflow: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <List disablePadding>
          {filteredNodes.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ p: 2, textAlign: 'center' }}
            >
              无匹配数据
            </Typography>
          ) : (
            renderItems(filteredNodes)
          )}
        </List>
      </Box>
    </Box>
  );
};

export default TreeSelector;
