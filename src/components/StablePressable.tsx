/* Hallmark · interaction repair · existing Margen theme
 * pre-emit critique: P4 H4 E4 S5 R5 V3 */
import React, { createContext, useContext, useRef } from 'react';
import { Pressable, PressableProps } from 'react-native';
import { TapGesture } from '../domain/navigation';

export const ScrollPressGuard = createContext<() => boolean>(() => true);
export default function StablePressable(props: PressableProps) {
  const gesture = useRef(new TapGesture());
  const mayPress = useContext(ScrollPressGuard);
  return <Pressable {...props}
    onTouchStart={event => {
      gesture.current.start(event.nativeEvent.pageX, event.nativeEvent.pageY);
      if (!mayPress()) gesture.current.cancel();
      props.onTouchStart?.(event);
    }}
    onTouchMove={event => { gesture.current.move(event.nativeEvent.pageX, event.nativeEvent.pageY); props.onTouchMove?.(event); }}
    onTouchEnd={event => { gesture.current.finish(); props.onTouchEnd?.(event); }}
    onTouchCancel={event => { gesture.current.cancel(); props.onTouchCancel?.(event); }}
    onPress={event => { if (gesture.current.canPress() && mayPress()) props.onPress?.(event); }} />;
}
