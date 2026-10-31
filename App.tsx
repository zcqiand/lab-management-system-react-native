/**
 * @format
 */

import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet, Text} from 'react-native';

// Phase 0 骨架——零业务。首个功能切片进 App 前先走 TDD（fnTest 挂 ID，phase lock
// ADR-0044）；业务组件归 src/ 分层，禁在 App.tsx 堆逻辑。
function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>lab-management-system-react-native</Text>
      <Text style={styles.hint}>suite react-native profile · Phase 0 骨架（零业务）</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#888888',
  },
});

export default App;
