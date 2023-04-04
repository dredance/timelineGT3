"use strict";


import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
//import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import { ITooltipServiceWrapper, createTooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import { Selection, select, selectAll, BaseType } from "d3-selection"
import { ScaleTime, scaleTime, ScaleBand, scaleBand } from "d3-scale"
import { axisBottom } from "d3-axis"
import { timeMonths } from "d3-time"
import { timeFormat, timeFormatDefaultLocale } from "d3-time-format"
import { format, formatDefaultLocale } from "d3-format"
import { transition, Transition } from "d3-transition"
import { easeSin } from "d3-ease"
// import { VisualFormattingSettingsModel } from "./settings";
import { transformData, VData, VDataItem, VMargins} from "./transformdata"

import ISelectionId = powerbi.extensibility.ISelectionId
import ISelectionManager = powerbi.extensibility.ISelectionManager




import * as d3 from "d3";


export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost
    private sm: ISelectionManager
    //private formattingSettings: VisualFormattingSettingsModel;
    //private formattingSettingsService: FormattingSettingsService;
    private svg: Selection<SVGElement, any, HTMLElement, any>
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private axisX2MonthsTag: d3.Selection<SVGElement, any, any, any>;
    private axisX1MonthsTag: d3.Selection<SVGElement, any, any, any>;
    // private axisY: d3.Selection<SVGElement, any, any, any>;
    private barContainer: d3.Selection<SVGElement, any, any, any>;
    private label: d3.Selection<SVGElement, any, any, any>;
    private symbol: d3.Selection<SVGElement, any, any, any>;
    private line: d3.Selection<SVGElement, any, any, any>;

    private transition: Transition<BaseType, unknown, null, undefined>
    private width: number
    private height: number
    private margins: VMargins
    //private settings: VisualSettings;
    private data: VData

    constructor(options: VisualConstructorOptions) {
        this.host = options.host
        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
        //this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.sm = this.host.createSelectionManager()
        this.margins = {top: 0, bottom: 20, right: 20, left: 20};


        if (document) {
            this.svg = select(this.target).append('svg')
            this.barContainer = this.svg.append('g');
            this.axisX2MonthsTag = this.svg.append('g');
            this.axisX1MonthsTag = this.svg.append('g');
            // this.axisY = this.svg.append('g');
            this.label = this.svg.append('g');
            this.symbol = this.svg.append('g');
            this.line = this.svg.append('g');
            console.log('1')
        }

        formatDefaultLocale({
            "decimal": ",",
            "thousands": " ",
            "grouping": [3],
            "currency": ["", " zł"]});
        timeFormatDefaultLocale({
            "dateTime": "%d.%m.%Y",
            "date": "%d.%m.%Y",
            "time": "%H:%M:%S",
            "periods": ["AM", "PM"],
            "days": ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"],
            "shortDays": ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"],
            "months": ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
            "shortMonths": ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"]
          });

        /////////// SHADOW ////////////
        const defs = this.svg.append("defs");
        let filter = defs.append("filter")
            .attr("id", "dropshadow")
        //Create blur effect
        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha") // Create blur effect acrossborder, SourceGraphic
            .attr("stdDeviation", 1) // Amount of blur
            .attr("result", "blur");
        //Drop Shadow - Intensity and direction of shadow
        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 0)
            .attr("dy", -1)
            .attr("result", "offsetBlur");
        let feMerge = filter.append("feBlend")
            .attr("in", "SourceGraphic")
            .attr("in2", "blurIn")
            .attr("mode", "normal")
        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur")
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");
        ////////////////////////////////

        //// GRADIENT ////
        // Create the svg:defs element and the main gradient definition.
        var svgDefs = this.svg.append('defs');
        let linearGradient = `<linearGradient id="mainGradient" x1="0%" y1="0%" x2="0%" y2="50%">
                            <stop offset="0%" class="stop-left" /> 
                            <stop offset="100%" class="stop-right" />
                            </linearGradient>`;
        svgDefs.html(linearGradient);
        //////////////////

        //// PATTERN ////
        // Create the svg:defs element and the main gradient definition.
        let svgDefsPatern1 = this.svg.append('defs');   /*patternTransform="rotate(45)"*/
        let paternZakres = `<pattern id="hashZakres" width="2" height="2" patternUnits="userSpaceOnUse">
                                <rect width="1" height="2" transform="translate(0,0)" fill="rgba(33, 34, 33, 0.08)"</rect>
                            </pattern>`;
        svgDefsPatern1.html(paternZakres);
        let svgDefsPatern2 = this.svg.append('defs'); 
        let paternOpoznienie = `<pattern id="hashOpoznienie" width="2" height="2" patternUnits="userSpaceOnUse">
                                    <rect width="1" height="2" transform="translate(0,0)" fill="#ff7b336b"</rect>
                                </pattern>`;
        svgDefsPatern2.html(paternOpoznienie);
        //////////////////
    }
    

    public update(options: VisualUpdateOptions) {
        
        // // SPRAWDZENIE CZY SĄ DANE
        // if (isDataReady(options) == false) {return};
        //this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);
        console.log(2)
        //data
        this.data = transformData(options,this.host)
        console.log(this.data)

        //transition
        this.transition = transition().duration(1000).ease(easeSin)

        //svg
        this.width = options.viewport.width; // lub 100%
        this.height = options.viewport.height; // lub 100%
        this.svg.attr('width', this.width).attr('height', this.height)

        //scales
        this.dAxisX()
        this.dAxisY()

        //gantt
        this.gantt()  
        this.drawBarCurrency()

        
    };
    

    // public getFormattingModel(): powerbi.visuals.FormattingModel {
    //     return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    // }
    //////////////// FUNKCJE USTAWIANIE SKALI OSI DLA X i Y  /////////////////////////
    private dAxisY ():any {
        // OS Y
        let _ = require('lodash');
        let yband = _.range(this.data.items.length*2);  
        const y = scaleBand()
                .domain(yband)
                .rangeRound([this.margins.top,this.height-this.margins.bottom])
                .padding(0.2)
                ;
        return y
        ;
    };


    private dAxisX():any {
        // OS X
        let rangeStart:Date = new Date();
        rangeStart.setTime(this.data.minDate.getTime());
        rangeStart.setDate(rangeStart.getDate() - 31 );

        let rangeEnd:Date = new Date();
        rangeEnd.setTime(this.data.maxDate.getTime());
        rangeEnd.setDate(rangeEnd.getDate() + 51 );

        // Zakres osi X
        const range2Months = timeMonths(rangeStart, rangeEnd, 2);
        const range1Months = timeMonths(rangeStart, rangeEnd, 1);

        const x = scaleTime()
            .domain([rangeStart, rangeEnd])
            .range([this.margins.left, this.width-(this.margins.right)])
            ;

        // USTAWIANIE OSI X
        const elemAxis2MonthsTag = axisBottom(x)
        elemAxis2MonthsTag.tickValues(range2Months)
            .tickFormat(timeFormat("%b'%y")) // format
            .ticks(4)
            .tickSize(5)
            .tickSizeOuter(0)
            ;
        this.axisX2MonthsTag.attr('transform', `translate(0,${this.height-this.margins.bottom+6})`)
        .classed("axisX2MonthsTag", true).style("text-anchor", "start")
        .transition().ease(easeSin).duration(1000)
        .call(elemAxis2MonthsTag.bind(this))
        ;   

        const elemAxis1MonthsTag = axisBottom(x)
        elemAxis1MonthsTag.tickValues(range1Months)
            .tickFormat(timeFormat("")) // format
            .ticks(1)
            .tickSize(3)
            .tickSizeOuter(0)
            ;  
        this.axisX1MonthsTag.attr('transform', `translate(0,${this.height-this.margins.bottom+6})`)
            .classed("axisX1MonthsTag", true)
            .transition().ease(easeSin).duration(1000)
            .call(elemAxis1MonthsTag.bind(this))
            ;

        // STRZAŁKI DLA OSI X
        symbols([rangeEnd], this.symbol, 'M 0 0 12 6 0 12 3 6', 'arrowOsX', 
        `translate(${x(rangeEnd)-6},${this.height-this.margins.bottom})`);

        return x
    };


    ////////////// RYSOWANIE /////////////
    //\\ GANTT
    private gantt(x=this.dAxisX(),y=this.dAxisY()) {
        let formatCurrency = format("$,.2f")
        //////////// WYKONANIE //////////////////
        // LABEL
        labeling(this.data.items, this.label, 'plan_label_wykonanie', 
            d => `<tspan dx=0.6em> ${Math.round(d.pct_plan*1000)/10}% ${d.task_name} (${formatCurrency(d.value_plan)})</tspan>`
            ,
            d => x(d.start_plan),
            d => y(d.index*2)+y.bandwidth()/2,'','', true
        );
        //////////// ZAKRES //////////////////
        // BAR
        recting(this.data.items,
            d => y(d.index*2),
            x, y, this.barContainer, 'plan_bar_zakres',
            d => (x(d.end_plan)-x(d.start_plan)),
            d => x(d.start_plan),
            true, true
        );
        
        
        // // REAL
        // recting(this.data.items,
        //     d => y(d.index*2+1),
        //     x, y, this.barContainer, 'bar_wykonanie',
        //     d => (x(d.end_curr)-x(d.start_curr))*d.pct_real,
        //     d => x(d.start_curr),
        //     false, true
        // );
        // LABEL
        // labeling(this.data.items, this.label, 'label_wykonanie', 
        //     d => `<tspan dx=0.6em> ${Math.round(d.pct_real*1000)/10}% ${d.task_name} (${formatCurrency(d.value_fcst)})</tspan>
        //     <tspan dx=0.6em style="fill:${d.value_fcst<=d.value_plan ? 'green' : 'red'};">${formatCurrency(d.value_fcst-d.value_plan)}</tspan>`
        //     ,
        //     d => x(d.start_curr),
        //     d => y(d.index*2+1)+y.bandwidth()/2,'','', true
        // );
        // //////////// ZAKRES //////////////////
        // // BAR
        // recting(this.data.items,
        //     d => y(d.index*2+1),
        //     x, y, this.barContainer, 'bar_zakres',
        //     d => (x(d.end_curr)-x(d.start_curr)),
        //     d => x(d.start_curr),
        //     true, true
        // );
 
    
        /////////////// OKRES //////////////
        // LINE
        lineing ([this.data.period], this.line, 'okres1', d => x(d), 0,
            d => x(d), this.height,'',true
        );
        lineing ([this.data.period], this.line, 'okres', d => x(d)-2, 0,
            d => x(d)-2, this.height,'',true
        );
        // LABEL
        let formatDay = timeFormat("%d %b %y")
        labeling([this.data.period], this.line, "label_okres", d => formatDay(d)+'&nbsp;&nbsp;', 
            d => x(d),
            this.height-20//margins.top+15,
            ,'','',true

        );
    };

    private drawBarCurrency (x=this.dAxisX(), y=this.dAxisY()) {
        const formatCurrency = format("$,.2f")
        // DEFINOWANIE 
        const barRange = this.barContainer.selectAll('rect.bar_zakres').data(this.data.items);
        // TWORZENIE 
        barRange.enter().append('rect')
            .classed('bar_zakres', true)
            .attr('ix', (d, i) => i)
            .attr('height', y.bandwidth()) // szerokość baru
            .attr('width', d => (x(d.end_curr)-x(d.start_curr)))
            .attr('y', d => y(d.index*2+1))//dataPoint => y(dataPoint.category)) // zaczynamy od jakiego punktu y
            .attr('x', d => x(d.start_curr)) // zaczynamy od jakiego punktu x
            .attr("filter", "url(#dropshadow)")
            .on('click', (e) => {
                const el = select(e.target)
                const d = <{selectionId: ISelectionId}>el.data()[0]
                const ix = el.attr('ix')
                this.sm.select(d.selectionId).then((selected) => {
                    selectAll('.bar_wykonanie, .bar_zakres, .label_wykonanie, .plan_bar_zakres, .plan_label_wykonanie')//`.${el.attr('class')}`)
                        .style('fill-opacity', selected.length > 0 ? 0.25 : 1)
                        .style('stroke-opacity', selected.length > 0 ? 0.25 : 1)
                    selectAll(`[ix='${ix}']`).style('stroke-opacity', 1)
                        .style('fill-opacity', 1)
                })
            })

        // POWTÓRZENIE PRZY UPDATE
        barRange.transition(this.transition)
        .attr('height', y.bandwidth()) // szerokość baru
        .attr('width', d => (x(d.end_curr)-x(d.start_curr)))
        .attr('y', d => y(d.index*2+1))//dataPoint => y(dataPoint.category)) // zaczynamy od jakiego punktu y
        .attr('x', d => x(d.start_curr)) // zaczynamy od jakiego punktu x
        barRange.exit().remove();

        // DEFINOWANIE PASKU WYKONANIA
        const barWykon = this.barContainer.selectAll('rect.bar_wykonanie').data(this.data.items);
        // TWORZENIE 
        barWykon.enter().append('rect')
            .classed('bar_wykonanie', true)
            .attr('ix', (d, i) => i)
            .attr('height', y.bandwidth()) // szerokość baru
            .attr('width', d => (x(d.end_curr)-x(d.start_curr))*d.pct_real)
            .attr('y', d => y(d.index*2+1))//dataPoint => y(dataPoint.category)) // zaczynamy od jakiego punktu y
            .attr('x', d => x(d.start_curr)) // zaczynamy od jakiego punktu x
            .attr("filter", "url(#dropshadow)")
            .on('click', (e) => {
                const el = select(e.target)
                const d = <{selectionId: ISelectionId}>el.data()[0]
                const ix = el.attr('ix')
                this.sm.select(d.selectionId).then((selected) => {
                    selectAll('.bar_wykonanie, .bar_zakres, .label_wykonanie, .plan_bar_zakres, .plan_label_wykonanie')//`.${el.attr('class')}`)
                        .style('fill-opacity', selected.length > 0 ? 0.25 : 1)
                        .style('stroke-opacity', selected.length > 0 ? 0.25 : 1)
                    selectAll(`[ix='${ix}']`).style('stroke-opacity', 1)
                        .style('fill-opacity', 1)
                })
            })
            ;
        // POWTÓRZENIE PRZY UPDATE
        barWykon.transition(this.transition)
        .attr('height', y.bandwidth()) // szerokość baru
        .attr('width', d => (x(d.end_curr)-x(d.start_curr))*d.pct_real)
        .attr('y', d => y(d.index*2+1))//dataPoint => y(dataPoint.category)) // zaczynamy od jakiego punktu y
        .attr('x', d => x(d.start_curr)) // zaczynamy od jakiego punktu x
        barWykon.exit().remove();
        

        // DEFINOWANIE LABEL WYKONANIA
        //data, labelContainer, className, text, xPoint, yPoint, fill? ,sizeBold?, animate?, transform?) {
        const labelx = this.label.selectAll("text.label_wykonanie").data(this.data.items);
        labelx.enter()
            .append('text')
            .text( d => `${Math.round(d.pct_real*1000)/10}% ${d.task_name} (${formatCurrency(d.value_fcst)})`
            //<tspan dx=0.6em style="fill:${d.value_fcst<=d.value_plan ? 'green' : 'red'};">${formatCurrency(d.value_fcst-d.value_plan)}</tspan>`
            )
            .classed('label_wykonanie', true)
            .attr('ix', (d, i) => i)
            .attr("x", d => x(d.start_curr))
            .attr("y", d => y(d.index*2+1)+y.bandwidth()/2)
            .on('click', (e) => {
                const el = select(e.target)
                const d = <{selectionId: ISelectionId}>el.data()[0]
                const ix = el.attr('ix')
                this.sm.select(d.selectionId).then((selected) => {
                    selectAll('.bar_wykonanie, .bar_zakres, .label_wykonanie, .plan_bar_zakres, .plan_label_wykonanie')//`.${el.attr('class')}`)
                        .style('fill-opacity', selected.length > 0 ? 0.25 : 1)
                        .style('stroke-opacity', selected.length > 0 ? 0.25 : 1)
                    selectAll(`[ix='${ix}']`).style('stroke-opacity', 1)
                        .style('fill-opacity', 1)
                })
            })
            ;
        // POWTÓZENIE PRZY ODŚWIEŻENIU zmiana szerokości, wysokości okienek
        labelx
            .transition(this.transition)
            .attr("x", d => x(d.start_curr))
            .attr("y", d => y(d.index*2+1)+y.bandwidth()/2)
        labelx.exit().remove();

        this.tooltipServiceWrapper.addTooltip(barRange,
            (d: VDataItem) => this.getTooltipData(d),
            (d: VDataItem) =>  d.selectionId);
        this.tooltipServiceWrapper.addTooltip(barWykon,
            (d: VDataItem) => this.getTooltipData(d),
            (d: VDataItem) => d.selectionId);
        this.tooltipServiceWrapper.addTooltip(labelx,
            (d: VDataItem) => this.getTooltipData(d),
            (d: VDataItem) => d.selectionId);


        return barRange;
    };

    private getTooltipData(d: any): VisualTooltipDataItem[] {
        return [{
            displayName: d.task_name,
            value: d.value_plan.toString(),
            color: d.color,
            header: 'ToolTip Title'
        }];
    }


    private drawBar (className, yStart,xStart, x=this.dAxisX(), y=this.dAxisY()) {
        const labelx = this.label.selectAll(`text.${className}`).data(this.data.items);
        labelx.enter()
            .append('text')
            .text( d => `${Math.round(d.pct_real*1000)/10}% ${d.task_name} (${this.formatCurrency(d.value_fcst)})`
            //<tspan dx=0.6em style="fill:${d.value_fcst<=d.value_plan ? 'green' : 'red'};">${formatCurrency(d.value_fcst-d.value_plan)}</tspan>`
            )
            .classed(className, true)
            .attr('ix', (d, i) => i)
            .attr("x", xStart)
            .attr("y", yStart)
            .on('click', (e) => {
                this.host.tooltipService.hide({
                    isTouchEvent: false,
                    immediately: true
                });
                const el = select(e.target)
                const d = <{selectionId: ISelectionId}>el.data()[0]
                const ix = el.attr('ix')
                this.sm.select(d.selectionId).then((selected) => {
                    selectAll('.bar_wykonanie, .bar_zakres, .label_wykonanie, .plan_bar_zakres, .plan_label_wykonanie')//`.${el.attr('class')}`)
                        .style('fill-opacity', selected.length > 0 ? 0.25 : 1)
                        .style('stroke-opacity', selected.length > 0 ? 0.25 : 1)
                    selectAll(`[ix='${ix}']`).style('stroke-opacity', 1)
                        .style('fill-opacity', 1)
                })
            })
            ;
        // POWTÓZENIE PRZY ODŚWIEŻENIU zmiana szerokości, wysokości okienek
        labelx
            .transition(this.transition)
            .attr("x", xStart)
            .attr("y",yStart)
        labelx.exit().remove();

        return labelx
    };


    private drawLabel (className, yStart,xStart, x=this.dAxisX(), y=this.dAxisY()) {
        const labelx = this.label.selectAll(`text.${className}`).data(this.data.items);
        labelx.enter()
            .append('text')
            .text( d => `${Math.round(d.pct_real*1000)/10}% ${d.task_name} (${this.formatCurrency(d.value_fcst)})`
            //<tspan dx=0.6em style="fill:${d.value_fcst<=d.value_plan ? 'green' : 'red'};">${formatCurrency(d.value_fcst-d.value_plan)}</tspan>`
            )
            .classed(className, true)
            .attr('ix', (d, i) => i)
            .attr("x", xStart)
            .attr("y", yStart)
            .on('click', (e) => {
                this.host.tooltipService.hide({
                    isTouchEvent: false,
                    immediately: true
                });
                const el = select(e.target)
                const d = <{selectionId: ISelectionId}>el.data()[0]
                const ix = el.attr('ix')
                this.sm.select(d.selectionId).then((selected) => {
                    selectAll('.bar_wykonanie, .bar_zakres, .label_wykonanie, .plan_bar_zakres, .plan_label_wykonanie')//`.${el.attr('class')}`)
                        .style('fill-opacity', selected.length > 0 ? 0.25 : 1)
                        .style('stroke-opacity', selected.length > 0 ? 0.25 : 1)
                    selectAll(`[ix='${ix}']`).style('stroke-opacity', 1)
                        .style('fill-opacity', 1)
                })
            })
            ;
        // POWTÓZENIE PRZY ODŚWIEŻENIU zmiana szerokości, wysokości okienek
        labelx
            .transition(this.transition)
            .attr("x", xStart)
            .attr("y",yStart)
        labelx.exit().remove();

        return labelx
    };

};