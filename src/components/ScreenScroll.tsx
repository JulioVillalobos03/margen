import React, { useRef } from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { ScrollPressGuard } from './StablePressable';

/** Restore once on intentional navigation; ordinary state updates never reset offset. */
export default function ScreenScroll({ initialOffset, onOffset, ...props }: ScrollViewProps & { initialOffset: number; onOffset: (y: number) => void }) {
  const scroll = useRef<ScrollView>(null);
  const restored = useRef(false);
  const blockUntil = useRef(0);
  return <ScrollPressGuard.Provider value={() => Date.now() >= blockUntil.current}>
    <ScrollView {...props} ref={scroll} style={[{ flex: 1 }, props.style]} scrollEventThrottle={32}
      keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" removeClippedSubviews={false}
      onContentSizeChange={(w, h) => {
        if (!restored.current) {
          restored.current = true;
          scroll.current?.scrollTo({ y: initialOffset, animated: false });
        }
        props.onContentSizeChange?.(w, h);
      }}
      onScroll={event => { blockUntil.current = Date.now() + 100; onOffset(Math.max(0, event.nativeEvent.contentOffset.y)); props.onScroll?.(event); }}
      onScrollBeginDrag={event => { blockUntil.current = Date.now() + 150; props.onScrollBeginDrag?.(event); }}
      onScrollEndDrag={event => { blockUntil.current = Date.now() + 150; props.onScrollEndDrag?.(event); }}
      onMomentumScrollBegin={event => { blockUntil.current = Date.now() + 150; props.onMomentumScrollBegin?.(event); }}
      onMomentumScrollEnd={event => { blockUntil.current = Date.now() + 100; props.onMomentumScrollEnd?.(event); }} />
  </ScrollPressGuard.Provider>;
}
