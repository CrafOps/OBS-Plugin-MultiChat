#pragma once

#include <QCheckBox>
#include <QColor>
#include <QPen>
#include <QStyle>
#include <QPainter>
#include <QPainterPath>
#include <QStyleOptionButton>

class ReadableCheckBox final : public QCheckBox {
public:
    using QCheckBox::QCheckBox;

protected:
    void paintEvent(QPaintEvent *event) override
    {
        QCheckBox::paintEvent(event);
        if (!isChecked()) {
            return;
        }
        QStyleOptionButton option;
        initStyleOption(&option);
        const auto rectangle = style()->subElementRect(QStyle::SE_CheckBoxIndicator, &option, this);
        QPainter painter(this);
        painter.setRenderHint(QPainter::Antialiasing);
        painter.setPen(QPen(isEnabled() ? QColor("#111827") : QColor("#68748c"),
            2.5, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
        QPainterPath tick;
        tick.moveTo(rectangle.left() + rectangle.width() * 0.23, rectangle.top() + rectangle.height() * 0.51);
        tick.lineTo(rectangle.left() + rectangle.width() * 0.43, rectangle.top() + rectangle.height() * 0.72);
        tick.lineTo(rectangle.left() + rectangle.width() * 0.78, rectangle.top() + rectangle.height() * 0.28);
        painter.drawPath(tick);
    }
};
