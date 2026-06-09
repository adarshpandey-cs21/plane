/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "avi", "wmv", "mkv", "mpeg", "ogg"]);

export const isImageFile = (ext: string): boolean => IMAGE_EXTENSIONS.has(ext.toLowerCase());
export const isVideoFile = (ext: string): boolean => VIDEO_EXTENSIONS.has(ext.toLowerCase());
export const isPreviewableFile = (ext: string): boolean => isImageFile(ext) || isVideoFile(ext);

type TAttachmentPreview = {
  isOpen: boolean;
  onClose: () => void;
  fileURL: string;
  fileName: string;
  fileExtension: string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
};

// Stop all events from bubbling through React's synthetic event system.
// React portals bubble events through the React tree (not the DOM tree),
// which would reach the parent react-dropzone and open the file chooser.
const stopBubble = (e: React.SyntheticEvent) => {
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
};

export const AttachmentPreview: React.FC<TAttachmentPreview> = (props) => {
  const {
    isOpen,
    onClose,
    fileURL,
    fileName,
    fileExtension,
    onPrev,
    onNext,
    hasPrev = false,
    hasNext = false,
    currentIndex,
    totalCount,
  } = props;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext && onNext) onNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!isOpen) return null;

  const downloadURL = `${fileURL}${fileURL?.includes("?") ? "&" : "?"}download=true`;

  const handleOverlayClick = (e: React.MouseEvent) => {
    stopBubble(e);
    onClose();
  };

  const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
    stopBubble(e);
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev();
    if (e.key === "ArrowRight" && hasNext && onNext) onNext();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      onMouseDown={stopBubble}
      role="dialog"
      aria-modal="true"
      data-prevent-outside-click
    >
      {/* Top-right actions */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <a
          href={downloadURL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          onClick={stopBubble}
          title="Download"
        >
          <Download className="h-5 w-5" />
        </a>
        <button
          type="button"
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          onClick={(e) => {
            stopBubble(e);
            onClose();
          }}
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Left arrow */}
      {hasPrev && onPrev && (
        <button
          type="button"
          className="absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          onClick={(e) => {
            stopBubble(e);
            onPrev();
          }}
          title="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Right arrow */}
      {hasNext && onNext && (
        <button
          type="button"
          className="absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          onClick={(e) => {
            stopBubble(e);
            onNext();
          }}
          title="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Content */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div className="max-h-[90vh] max-w-[90vw]" onClick={stopBubble}>
        {isImageFile(fileExtension) && (
          <img
            src={fileURL}
            alt={fileName}
            className="max-h-[90vh] max-w-[90vw] rounded object-contain"
            draggable={false}
          />
        )}
        {isVideoFile(fileExtension) && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video key={fileURL} src={fileURL} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded">
            Your browser does not support the video tag.
          </video>
        )}
      </div>

      {/* File name + counter */}
      <div className="text-sm absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-black/50 px-3 py-1 text-white/70">
        {fileName}.{fileExtension}
        {totalCount != null && currentIndex != null && totalCount > 1 && (
          <span className="ml-2">
            ({currentIndex + 1} / {totalCount})
          </span>
        )}
      </div>
    </div>,
    document.body
  );
};
