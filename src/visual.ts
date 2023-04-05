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




// FORMATY DEFALTU
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

    private formatCurrency: any
    private formatDay: any
    private classNames: string

    constructor(options: VisualConstructorOptions) {
        this.host = options.host
        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
        //this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.sm = this.host.createSelectionManager()
        this.margins = {top: 0, bottom: 20, right: 20, left: 20};
        this.formatCurrency = format("$,.2f")
        this.formatDay = timeFormat("%d.%m.%Y")
        this.classNames = '.bar_wykonanie, .bar_zakres, .label_wykonanie, .bar_opoznienie, .label_opoznienie, .plan_bar_zakres, .plan_label_wykonanie,.label_diff'

        if (document) {
            this.svg = select(this.target).append('svg')
            this.barContainer = this.svg.append('g');
            this.axisX2MonthsTag = this.svg.append('g');
            this.axisX1MonthsTag = this.svg.append('g');
            // this.axisY = this.svg.append('g');
            this.label = this.svg.append('g');
            this.symbol = this.svg.append('g');
            this.line = this.svg.append('g');
        }


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
        let linearGradient = `<linearGradient id="mainGradient" x1="0%" y1="0%" x2="0%" y2="120%">
                            <stop offset="0%" class="stop-left" /> 
                            <stop offset="100%" class="stop-right" />
                            </linearGradient>`;
        svgDefs.html(linearGradient);
        //////////////////

        //// PATTERN ////
        // Create the svg:defs element and the main gradient definition.
        let svgDefsPatern1 = this.svg.append('defs');   /*patternTransform="rotate(45)"*/
        let paternZakres = `<pattern id="hashZakres" width="2" height="2" patternUnits="userSpaceOnUse">
                                <rect width="1" height="2" transform="translate(0,0)" fill="rgba(33, 34, 33, 0.05)"</rect>
                            </pattern>`;
        svgDefsPatern1.html(paternZakres);
        let svgDefsPatern2 = this.svg.append('defs'); 
        let paternOpoznienie = `<pattern id="hashOpoznienie" width="2" height="2" patternUnits="userSpaceOnUse">
                                    <rect width="1" height="2" transform="translate(0,0)" fill="#b683686b"</rect>
                                </pattern>`;
        svgDefsPatern2.html(paternOpoznienie);
        //////////////////
    }
    

    public update(options: VisualUpdateOptions) {
        
        // // SPRAWDZENIE CZY SĄ DANE
        // if (isDataReady(options) == false) {return};
        //this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);

        //data
        this.data = transformData(options,this.host)

        //transition
        this.transition = transition().duration(1000).ease(easeSin)

        //svg
        this.width = options.viewport.width; // lub 100%
        this.height = options.viewport.height; // lub 100%
        this.svg.attr('width', this.width).attr('height', this.height)

        //scales
        let x= this.dAxisX()
        let y = this.dAxisY()


        // OKRES //////////////
        // LINE
        this.lineing ([this.data.period], this.line, 'okres1', d => x(d), 0,
            d => x(d), this.height,'',true
        );
        this.lineing ([this.data.period], this.line, 'okres', d => x(d)-2, 0,
            d => x(d)-2, this.height,'',true
        );
        // LABEL
        let formatDayOkres = timeFormat("%d %b %y")
        this.drawLabel([this.data.period],"label_okres",this.height-16, d => x(d)-5, d => formatDayOkres(d))


        // GANTT
        ////Plan
        this.drawBar('plan_bar_zakres',d => y(d.index*2),d => x(d.start_plan), d => (x(d.end_plan)-x(d.start_plan)))
        this.drawLabel(this.data.items,'plan_label_wykonanie',d => y(d.index*2)+y.bandwidth()/2,d => x(d.start_plan)
        ,d => `${Math.round(d.pct_plan*1000)/10}% ${d.task_name} (${this.formatCurrency(d.value_plan)})`)
        ////Real
        let real_gantt = this.drawBar('bar_zakres',d => y(d.index*2+1),d => x(d.start_curr), d => (x(d.end_plan)-x(d.start_plan)))
        let opoz_gantt = this.drawBar('bar_opoznienie',d => y(d.index*2+1),d => x(d.end_plan), d => d.end_curr>d.end_plan ? (x(d.end_curr)-x(d.end_plan)):0)
        let wykon_gantt = this.drawBar('bar_wykonanie',d => y(d.index*2+1),d => x(d.start_curr),d => (x(d.end_curr)-x(d.start_curr))*d.pct_real)

        let opoz_gantt_label = this.drawLabel(this.data.items,'label_opoznienie', d => y(d.index*2+1)-y(1)/2+y.bandwidth()/2
        , d => x(d.end_plan)+(x(d.end_curr)-x(d.end_plan))/2, d => this.monthDiff(d.end_plan,d.end_curr)
        , d => d.end_curr>d.end_plan ? 'red': "green")
        
        let wykon_gantt_label = this.drawLabel(this.data.items,'label_wykonanie',d => y(d.index*2+1)+y.bandwidth()/2,d => x(d.start_curr)
        ,d => `${Math.round(d.pct_real*1000)/10}% ${d.task_name} (${this.formatCurrency(d.value_fcst)})`)
        
        let diff_gantt_label = this.drawLabel(this.data.items,'label_diff',d => y(d.index*2+1)-y(1)/2+y.bandwidth()/2,d => x(d.end_curr)
        , d => `${d.value_fcst>d.value_plan ? '▲': d.value_fcst<d.value_plan ? "▼":""}${this.formatCurrency(d.value_fcst-d.value_plan)}`, d => d.value_fcst>d.value_plan ? 'red': "green")

        

        this.tooltipServiceWrapper.addTooltip(real_gantt,
            (d: VDataItem) => this.getTooltipData(d),
            (d: VDataItem) =>  d.selectionId);
        this.tooltipServiceWrapper.addTooltip(opoz_gantt,
            (d: VDataItem) => this.getTooltipData(d),
            (d: VDataItem) =>  d.selectionId);
        this.tooltipServiceWrapper.addTooltip(opoz_gantt_label,
            (d: VDataItem) => this.getTooltipData(d),
            (d: VDataItem) => d.selectionId);
        this.tooltipServiceWrapper.addTooltip(wykon_gantt,
            (d: VDataItem) => this.getTooltipData(d),
            (d: VDataItem) => d.selectionId);
        this.tooltipServiceWrapper.addTooltip(wykon_gantt_label,
            (d: VDataItem) => this.getTooltipData(d),
            (d: VDataItem) => d.selectionId);
        
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
        this.symbols([rangeEnd], this.symbol, 'M 0 0 12 6 0 12 3 6', 'arrowOsX', 
        `translate(${x(rangeEnd)-6},${this.height-this.margins.bottom})`);

        return x
    };
 

    private getTooltipData(d: any): VisualTooltipDataItem[] {
        return [{
            displayName: d.task_name,
            value: this.formatCurrency(d.value_fcst),
            color: d.color,
            header: ''
        }];
    }


    private drawBar (className,yStart,xStart,widthBar, x=this.dAxisX(), y=this.dAxisY()) {
        const barx = this.barContainer.selectAll(`rect.${className}`).data(this.data.items);
        barx.enter()
            .append('rect')
            .classed(className, true)
            .attr('ix', (d, i) => i)
            .attr('height', y.bandwidth()) // szerokość baru
            .attr('width', widthBar)
            .attr('y', yStart)//dataPoint => y(dataPoint.category)) // zaczynamy od jakiego punktu y
            .attr('x', xStart) // zaczynamy od jakiego punktu x
            .attr("filter", "url(#dropshadow)")
            .on('click', (e) => {
                this.host.tooltipService.hide({
                    isTouchEvent: false,
                    immediately: true
                });
                const el = select("."+className+`[ix='${e.index}']`)
                const d = <{selectionId: ISelectionId}>el.data()[0]
                const ix = el.attr('ix')
                this.sm.select(d.selectionId).then((selected) => {
                    selectAll(this.classNames)
                        .style('fill-opacity', selected.length > 0 ? 0.25 : 1)
                        .style('stroke-opacity', selected.length > 0 ? 0.25 : 1)
                    selectAll(`[ix='${ix}']`).style('stroke-opacity', 1)
                        .style('fill-opacity', 1)
                })
            })
            ;
        // POWTÓZENIE PRZY ODŚWIEŻENIU zmiana szerokości, wysokości okienek
        barx
            .transition(this.transition)
            .attr('height', y.bandwidth()) // szerokość baru
            .attr('width', widthBar)
            .attr("x", xStart)
            .attr("y",yStart)
        barx.exit().remove();

        return barx
    };


    private drawLabel (data, className, yStart,xStart,text,color?, x=this.dAxisX(), y=this.dAxisY()) {
        const labelx = this.label.selectAll(`text.${className}`).data(data);
        labelx.enter()
            .append('text')
            .text(text)
            .classed(className, true)
            .attr('ix', (d, i) => i)
            .attr("x", xStart)
            .attr("y", yStart)
            .style("fill", color? color: "")
            .on('click', (e) => {
                this.host.tooltipService.hide({
                    isTouchEvent: false,
                    immediately: true
                });
                const el = select("."+className+`[ix='${e.index}']`)
                const d = <{selectionId: ISelectionId}>el.data()[0]
                const ix = el.attr('ix')
                this.sm.select(d.selectionId).then((selected) => {
                    selectAll(this.classNames)//`.${el.attr('class')}`)
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
            .text(text)
            .attr("x", xStart)
            .attr("y",yStart)
            .style("fill", color? color: "")

        labelx.exit().remove();

        return labelx
    };

    private lineing (data, lineContainer, className, x1, y1, x2, y2, fill?, animate?) {
        const linex = lineContainer
            .selectAll('line.'+className)
            .data(data)
            ;
        linex.enter()
            .append('line')
            .classed(className, true)
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke', fill)
            ;
        // Powtórzenie
        if (animate) {
            linex.transition()
            .ease(easeSin)
            .duration(1000)
            .attr("x1",x1)
            .attr("x2",x2)
            .attr('y1', y1)
            .attr('y2', y2)
            .attr('stroke', fill)
        } else {
            linex.attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke', fill)
            ;
        };
        linex.exit().remove();
        return linex;
    };
    
    private symbols (dane, symbolContainer, mPatch, className, transform, fill?, animate?, strokeColor?) {
        const sym = symbolContainer
        .selectAll('path.'+className)
        .data(dane);
        sym.enter()
        .append("path") 
        .attr("d", mPatch) 
        .classed(className, true)
        .style('fill', fill)
        .attr("transform", transform)
        .style('stroke',strokeColor);
        if (animate) {
            sym.transition()
            .ease(easeSin)
            .duration(1000)
            .attr("d", mPatch) 
            .attr("transform", transform)
            .style('fill', fill)
            .style('stroke',strokeColor);
        } else {
            sym.attr("d", mPatch) 
            .style('fill', fill)
            .attr("transform", transform)
            .style('stroke',strokeColor);
        };
        sym.exit().remove()
    };


    private monthDiff(dateFrom:Date, dateTo:Date) {
        return dateTo>dateFrom ? 
            dateTo.getMonth() - dateFrom.getMonth() + 
            (12 * (dateTo.getFullYear() - dateFrom.getFullYear())) + ' mc'
        : ""
       }






};