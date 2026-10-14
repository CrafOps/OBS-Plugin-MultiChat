#pragma once

#include <QCheckBox>
#include <QColor>
#include <QPen>
#include <QStyle>
#include <QPainter>
#include <QPainterPath>
#include <QStyleOptionButton>
#include <QStylePainter>

class ReadableCheckBox final : public QCheckBox {
public:
    using QCheckBox::QCheckBox;

protected:
    void paintEvent(QPaintEvent *event) override
    {
        if (!isChecked()) {
            QCheckBox::paintEvent(event);
            return;
        }
        QStyleOptionButton option;
        initStyleOption(&option);
        const auto rectangle = style()->subElementRect(QStyle::SE_CheckBoxIndicator, &option, this);
        // Let Qt draw the label/focus, but suppress its native checkmark.
        option.state &= ~QStyle::State_On;
        option.state |= QStyle::State_Off;
        QStylePainter painter(this);
        painter.drawControl(QStyle::CE_CheckBox, option);
        painter.setRenderHint(QPainter::Antialiasing);
        painter.setPen(QPen(QColor("#a7b4ff"), 1));
        painter.setBrush(isEnabled() ? QColor("#8599f5") : QColor("#39445e"));
        painter.drawRoundedRect(QRectF(rectangle).adjusted(.5, .5, -.5, -.5), 4, 4);
        painter.setBrush(Qt::NoBrush);
        painter.setPen(QPen(isEnabled() ? QColor("#111827") : QColor("#68748c"),
            2.5, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
        QPainterPath tick;
        tick.moveTo(rectangle.left() + rectangle.width() * 0.23, rectangle.top() + rectangle.height() * 0.51);
        tick.lineTo(rectangle.left() + rectangle.width() * 0.43, rectangle.top() + rectangle.height() * 0.72);
        tick.lineTo(rectangle.left() + rectangle.width() * 0.78, rectangle.top() + rectangle.height() * 0.28);
        painter.drawPath(tick);
    }
};
