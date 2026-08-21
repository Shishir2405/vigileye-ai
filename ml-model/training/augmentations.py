"""
Domain-randomized augmentation pipeline (Albumentations) used during
training to generalize the detector across the lighting/weather/surface
conditions real inspections encounter — shadow, motion blur, wet concrete,
low light — rather than only the conditions present in the public datasets.
"""

import albumentations as A


def build_train_transforms(img_size: int = 640) -> A.Compose:
    return A.Compose(
        [
            A.RandomResizedCrop(size=(img_size, img_size), scale=(0.7, 1.0), ratio=(0.9, 1.1), p=1.0),
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.2),
            A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=0.6),
            A.RandomShadow(shadow_roi=(0, 0.4, 1, 1), num_shadows_limit=(1, 3), p=0.35),
            A.MotionBlur(blur_limit=7, p=0.25),
            A.GaussNoise(std_range=(0.02, 0.08), p=0.25),
            A.RandomRain(blur_value=3, brightness_coefficient=0.85, p=0.1),  # wet-surface simulation
            A.CLAHE(clip_limit=2.0, p=0.2),
            A.HueSaturationValue(hue_shift_limit=8, sat_shift_limit=15, val_shift_limit=10, p=0.4),
            A.CoarseDropout(num_holes_range=(1, 4), hole_height_range=(0.02, 0.08), hole_width_range=(0.02, 0.08), p=0.2),
        ],
        bbox_params=A.BboxParams(format="yolo", label_fields=["class_labels"], min_visibility=0.3),
    )


def build_val_transforms(img_size: int = 640) -> A.Compose:
    # No augmentation at eval time — validation must reflect real conditions.
    return A.Compose(
        [A.Resize(height=img_size, width=img_size)],
        bbox_params=A.BboxParams(format="yolo", label_fields=["class_labels"]),
    )
