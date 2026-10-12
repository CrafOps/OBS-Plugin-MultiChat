#pragma once

#include <QStyledItemDelegate>
#include "media-cache.hpp"

class ChatDelegate final : public QStyledItemDelegate {
public:
    explicit ChatDelegate(QObject *parent = nullptr);
    void paint(QPainter *painter, const QStyleOptionViewItem &option,
        const QModelIndex &index) const override;
    QSize sizeHint(const QStyleOptionViewItem &option,
        const QModelIndex &index) const override;

private:
    MediaCache *media;
};
